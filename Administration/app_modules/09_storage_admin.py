# pyright: reportUndefinedVariable=false, reportUnboundVariable=false, reportAttributeAccessIssue=false, reportFunctionMemberAccess=false, reportGeneralTypeIssues=false, reportCallIssue=false, reportArgumentType=false, reportInvalidTypeForm=false, reportPossiblyUnboundVariable=false
# **STORAGE-ADMIN KATEGORIE**
# Unterkapitel: Datenmodell-Status und Migration fuer lokale Multi-Server-Struktur.


def _storage_force_flag(value: Optional[str]) -> bool:
    raw = str(value or "").strip().lower()
    return raw in {"1", "true", "yes", "ja", "force", "--force"}


@bot.group(name="storage", invoke_without_command=True)
@commands.has_role("Admin")
async def storage_group(ctx: commands.Context):
    await ctx.send(
        "Storage-Commands:\n"
        "- `Eco storage status`\n"
        "- `Eco storage migrate [force]`\n"
        "Hinweis: `migrate` schreibt Daten in `Administration/data/...`."
    )


@storage_group.command(name="status")
@commands.has_role("Admin")
async def storage_status(ctx: commands.Context):
    global_snap = storage_status_snapshot()
    guild_snap = storage_status_snapshot(ctx.guild.id) if ctx.guild else None
    active_guild = get_active_guild_id()
    lines = ["**STORAGE STATUS**"]
    lines.append(f"- Aktiver Guild-Kontext: {active_guild if active_guild is not None else 'global'}")
    lines.append(f"- Schema-Version: {global_snap.get('schema_version')}")
    lines.append(f"- Data Root: {global_snap.get('data_root')}")
    lines.append(f"- Global Dir: {global_snap.get('global_dir')}")
    lines.append(f"- Guilds Dir: {global_snap.get('guilds_dir')}")
    lines.append("")
    lines.append("Global-Scope:")
    lines.append(f"- NPC Profile-Dateien: {global_snap.get('npc_profile_files')}")
    lines.append(f"- NPC Memory-Dateien: {global_snap.get('npc_memory_files')}")
    lines.append(f"- NPC Gruppen-Dateien: {global_snap.get('npc_group_files')}")
    lines.append(f"- State-Dateien: {global_snap.get('state_entity_files')}")
    lines.append(f"- Economy-Split-Dateien: {global_snap.get('economy_split_files')}")
    lines.append(f"- Transaction-Log-Dateien: {global_snap.get('transaction_log_files')}")
    if guild_snap:
        lines.append("")
        lines.append(f"Guild-Scope ({ctx.guild.id}):")
        lines.append(f"- Scope Dir: {guild_snap.get('scope_dir')}")
        lines.append(f"- NPC Profile-Dateien: {guild_snap.get('npc_profile_files')}")
        lines.append(f"- NPC Memory-Dateien: {guild_snap.get('npc_memory_files')}")
        lines.append(f"- NPC Gruppen-Dateien: {guild_snap.get('npc_group_files')}")
        lines.append(f"- State-Dateien: {guild_snap.get('state_entity_files')}")
        lines.append(f"- Economy-Split-Dateien: {guild_snap.get('economy_split_files')}")
        lines.append(f"- Transaction-Log-Dateien: {guild_snap.get('transaction_log_files')}")
    await send_long_message(ctx.channel, "\n".join(lines))


@storage_group.command(name="migrate")
@commands.has_role("Admin")
async def storage_migrate(ctx: commands.Context, force: Optional[str] = None):
    force_mode = _storage_force_flag(force)
    result = migrate_legacy_storage_to_data_v1(force=force_mode)

    # Split-/Shard-Dateien bewusst neu schreiben, damit der neue Datenbaum vollstaendig ist.
    save_npc_profiles()
    save_memory()
    save_lore()
    save_relics()
    save_economy()
    save_turn_state()
    save_contract_proposals()
    save_ai_usage()

    snap = storage_status_snapshot()
    moved = result.get("moved_keys", []) or []
    lines = ["**STORAGE MIGRATION ABGESCHLOSSEN**"]
    lines.append(f"- Force-Modus: {force_mode}")
    lines.append(f"- Uebernommene Legacy-Bloecke: {', '.join(moved) if moved else '(keine)'}")
    lines.append(f"- Data Root: {snap.get('data_root')}")
    lines.append(f"- NPC Profile-Dateien: {snap.get('npc_profile_files')}")
    lines.append(f"- NPC Memory-Dateien: {snap.get('npc_memory_files')}")
    lines.append(f"- State-Dateien: {snap.get('state_entity_files')}")
    lines.append(f"- Economy-Split-Dateien: {snap.get('economy_split_files')}")
    lines.append(f"- Transaction-Log-Dateien: {snap.get('transaction_log_files')}")
    await send_long_message(ctx.channel, "\n".join(lines))
