# Build tier1-enrich.js from companion extract + manual metadata
$companionPath = Join-Path $PSScriptRoot 'tier1-companion-source.txt'
if (-not (Test-Path $companionPath)) {
  Write-Error "Missing tier1-companion-source.txt. Place the SRD companion extract in the project root and re-run this script."
  exit 1
}
$companion = Get-Content $companionPath -Raw -Encoding UTF8

function Normalize-Text([string]$s) {
  if (-not $s) { return $s }
  $s = $s -replace [char]0x2019, "'"
  $s = $s -replace [char]0x2018, "'"
  $s = $s -replace [char]0x201C, '"'
  $s = $s -replace [char]0x201D, '"'
  $s = $s -replace [char]0x2014, '-'
  $s = $s -replace [char]0x2013, '-'
  $s = $s -replace 'fi sts', 'fists'
  $s = $s -replace 'fi ts', 'fits'
  $s = $s -replace 'confl ict', 'conflict'
  $s = $s -replace 'fl ames', 'flames'
  $s = $s -replace 'benefi ts', 'benefits'
  $s = $s -replace '\bdamag\.', 'damage.'
  return $s
}

$keyMap = @{
  'Acid Burrower'='acid_burrower'; 'Bear'='bear'; 'Cave Ogre'='cave_ogre'; 'Construct'='construct'
  'Courtier'='courtier'; 'Deeproot Defender'='deeproot_defender'; 'Dire Wolf'='dire_wolf'
  'Giant Mosquitoes'='giant_mosquitoes'; 'Giant Rat'='giant_rat'; 'Giant Scorpion'='giant_scorpion'
  'Glass Snake'='glass_snake'; 'Harrier'='harrier'; 'Archer Guard'='archer_guard'; 'Bladed Guard'='bladed_guard'
  'Head Guard'='head_guard'; 'Jagged Knife Bandit'='jk_bandit'; 'Jagged Knife Hexer'='jk_hexer'
  'Jagged Knife Kneebreaker'='jk_kneebreaker'; 'Jagged Knife Lackey'='jk_lackey'
  'Jagged Knife Lieutenant'='jk_lieutenant'; 'Jagged Knife Shadow'='jk_shadow'; 'Jagged Knife Sniper'='jk_sniper'
  'Merchant'='merchant'; 'Minor Chaos Elemental'='minor_chaos_elemental'; 'Minor Fire Elemental'='minor_fire_elemental'
  'Minor Demon'='minor_demon'; 'Minor Treant'='minor_treant'; 'Green Ooze'='green_ooze'; 'Tiny Green Ooze'='tiny_green_ooze'
  'Red Ooze'='red_ooze'; 'Tiny Red Ooze'='tiny_red_ooze'; 'Petty Noble'='petty_noble'
  'Pirate Captain'='pirate_captain'; 'Pirate Raiders'='pirate_raiders'; 'Pirate Tough'='pirate_tough'
  'Sellsword'='sellsword'; 'Skeleton Archer'='skeleton_archer'; 'Skeleton Dredge'='skeleton_dredge'
  'Skeleton Knight'='skeleton_knight'; 'Skeleton Warrior'='skeleton_warrior'; 'Spellblade'='spellblade'
  'Swarm Of Rats'='swarm_of_rats'; 'Sylvan Soldier'='sylvan_soldier'
  'Tangle Bramble Swarm'='tangle_bramble_swarm'; 'Tangle Bramble'='tangle_bramble'; 'Weaponmaster'='weaponmaster'
  'Young Dryad'='young_dryad'; 'Brawny Zombie'='brawny_zombie'; 'Patchwork Zombie Hulk'='patchwork_zombie_hulk'
  'Rotted Zombie'='rotted_zombie'; 'Shambling Zombie'='shambling_zombie'; 'Zombie Pack'='zombie_pack'
}

$manualDesc = @{
  zombie_pack = 'A group of shambling corpses instinctively moving together.'
  tiny_red_ooze = 'A small moving mound of translucent flaming red slime.'
}

$ranges = @{
  acid_burrower='Very Close'; bear='Melee'; cave_ogre='Very Close'; construct='Melee'; courtier='Melee'
  deeproot_defender='Close'; dire_wolf='Melee'; giant_mosquitoes='Melee'; giant_rat='Melee'; giant_scorpion='Melee'
  glass_snake='Very Close'; harrier='Close'; archer_guard='Far'; bladed_guard='Melee'; head_guard='Melee'
  jk_bandit='Melee'; jk_hexer='Far'; jk_kneebreaker='Melee'; jk_lackey='Melee'; jk_lieutenant='Close'
  jk_shadow='Melee'; jk_sniper='Far'; merchant='Melee'; minor_chaos_elemental='Close'; minor_fire_elemental='Far'
  minor_demon='Melee'; minor_treant='Melee'; green_ooze='Melee'; tiny_green_ooze='Melee'; red_ooze='Melee'
  tiny_red_ooze='Melee'; petty_noble='Melee'; pirate_captain='Melee'; pirate_raiders='Melee'; pirate_tough='Melee'
  sellsword='Melee'; skeleton_archer='Far'; skeleton_dredge='Melee'; skeleton_knight='Melee'; skeleton_warrior='Melee'
  spellblade='Melee'; swarm_of_rats='Melee'; sylvan_soldier='Melee'; tangle_bramble_swarm='Melee'; tangle_bramble='Melee'
  weaponmaster='Very Close'; young_dryad='Melee'; brawny_zombie='Very Close'; patchwork_zombie_hulk='Very Close'
  rotted_zombie='Melee'; shambling_zombie='Melee'; zombie_pack='Melee'
}

$skulk = @('dire_wolf','jk_shadow','green_ooze','tiny_green_ooze','red_ooze','tiny_red_ooze')

$hordes = @{
  giant_mosquitoes=@{ diceWeak='1d4+1'; hordePerHp=5 }
  pirate_raiders=@{ diceWeak='1d4+1'; hordePerHp=3 }
  swarm_of_rats=@{ diceWeak='1d4+1'; hordePerHp=10 }
  tangle_bramble_swarm=@{ diceWeak='1d4+2'; hordePerHp=3 }
  zombie_pack=@{ diceWeak='1d4+2'; hordePerHp=2 }
}

$minionCleave = @{
  giant_rat=3; jk_lackey=3; minor_treant=5; sellsword=4; skeleton_dredge=4; tangle_bramble=4; rotted_zombie=3
}

$summons = @{
  jk_lieutenant=@(@{ label='Summon 3 Lackeys'; templateKey='jk_lackey'; count=3 })
  petty_noble=@(@{ label='Summon Bladed Guards (1d4)'; templateKey='bladed_guard'; count=4; dice='1d4' })
  pirate_captain=@(@{ label='Summon Pirate Raiders'; templateKey='pirate_raiders'; count=1 })
  green_ooze=@(@{ label='Split: 2 Tiny Green Oozes'; templateKey='tiny_green_ooze'; count=2 })
  red_ooze=@(@{ label='Split: 2 Tiny Red Oozes'; templateKey='tiny_red_ooze'; count=2 })
}

function Get-CostTag($line) {
  if ($line -match 'Spend (\d+) Fear') { return "<span class='cost-tag fear'>$($Matches[1]) Fear</span> " }
  if ($line -match 'Mark a Stress') { return "<span class='cost-tag stress'>1 Stress</span> " }
  if ($line -match 'Mark an? HP') { return "<span class='cost-tag stress'>Mark HP</span> " }
  if ($line -match 'Reaction:' -or $line -match 'When the') { return "<span class='cost-tag'>Reaction</span> " }
  return "<span class='cost-tag'>Passive</span> "
}

function Escape-JsString([string]$s) {
  Normalize-Text $s | ForEach-Object { $_ -replace '\\', '\\\\' -replace '"', '\"' }
}

$descriptions = @{}
[regex]::Matches($companion, '(?ms)^### ([^\r\n]+)\r?\n\r?\n([^\r\n]+)\r?\n\r?\nType:') | ForEach-Object {
  $name = $_.Groups[1].Value.Trim()
  if (-not $keyMap.ContainsKey($name)) { return }
  $key = $keyMap[$name]
  $descriptions[$key] = Normalize-Text $_.Groups[2].Value.Trim()
}
foreach ($entry in $manualDesc.GetEnumerator()) {
  $descriptions[$entry.Key] = Normalize-Text $entry.Value
}

$features = @{}
[regex]::Matches($companion, '(?ms)^### ([^\r\n]+)\r?\n.*?#### Features\r?\n(.*?)(?=^### |^## Tier )') | ForEach-Object {
  $name = $_.Groups[1].Value.Trim()
  if (-not $keyMap.ContainsKey($name)) { return }
  $key = $keyMap[$name]
  $block = $_.Groups[2].Value.Trim()
  $items = @()
  foreach ($line in ($block -split '\r?\n')) {
    $line = $line.Trim()
    if (-not $line -or $line -notmatch '^([^:]+):\s*(.+)$') { continue }
    $featName = Normalize-Text $Matches[1].Trim()
    $featBody = Normalize-Text $Matches[2].Trim()
    $tag = Get-CostTag "$featName`: $featBody"
    $items += "$tag<b>$featName</b>: $featBody"
  }
  if ($items.Count -gt 0) { $features[$key] = $items }
}

# Zombie Pack features (not in companion extract)
$features['zombie_pack'] = @(
  "<span class='cost-tag'>Reaction</span> <b>Horde</b>: When the Zombies have marked half or more of their HP, their standard attack deals 1d4+2 physical damage instead.",
  "<span class='cost-tag'>Reaction</span> <b>Overwhelm</b>: When the Zombies mark HP from an attack within Melee range, you can mark a Stress to make a standard attack against the attacker."
)

$lines = @('// Auto-enrichment: desc, range, full SRD features, horde/minion/summon metadata', '(function enrichMonsterManual() {', '  const patch = {')

$keys = $ranges.Keys | Sort-Object
$i = 0
foreach ($key in $keys) {
  $obj = @()
  if ($descriptions.ContainsKey($key)) { $obj += "desc: `"$(Escape-JsString $descriptions[$key])`"" }
  $obj += "range: `"$($ranges[$key])`""
  if ($skulk -contains $key) { $obj += 'type: "Skulk"' }
  if ($key -eq 'spellblade') { $obj += 'damageType: "Physical/Magic"' }
  if ($hordes.ContainsKey($key)) {
    $obj += "diceWeak: `"$($hordes[$key].diceWeak)`""
    $obj += "hordePerHp: $($hordes[$key].hordePerHp)"
  }
  if ($minionCleave.ContainsKey($key)) { $obj += "minionCleave: $($minionCleave[$key])" }
  if ($summons.ContainsKey($key)) {
    $sumJson = ($summons[$key] | ForEach-Object {
      $note = if ($_.note) { ", note: `"$(Escape-JsString $_.note)`"" } else { '' }
      "{ label: `"$(Escape-JsString $_.label)`", templateKey: `"$($_.templateKey)`", count: $($_.count)$note }"
    }) -join ', '
    $obj += "summons: [$sumJson]"
  }
  if ($features.ContainsKey($key)) {
    $featJs = ($features[$key] | ForEach-Object { '"' + (Escape-JsString $_) + '"' }) -join ', '
    $obj += "features: [$featJs]"
  }
  $comma = if ($i -lt $keys.Count - 1) { ',' } else { '' }
  $lines += "    `"$key`": { $($obj -join ', ') }$comma"
  $i++
}

$lines += @('  };', '  for (const [key, data] of Object.entries(patch)) {', '    if (monsterManual[key]) Object.assign(monsterManual[key], data);', '  }', '})();')

$outPath = Join-Path $PSScriptRoot 'tier1-enrich.js'
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($outPath, ($lines -join "`n"), $utf8NoBom)
Write-Output "Enriched $($keys.Count) entries, desc $($descriptions.Count), features $($features.Count)"
