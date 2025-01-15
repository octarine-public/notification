import { ImageData, Menu } from "github.com/octarine-public/wrapper/index"

export class MenuManager {
	public readonly State: Menu.Toggle
	private readonly baseNode = Menu.AddEntry("Visual")

	private readonly tree = this.baseNode.AddNode(
		"Notifications-beta",
		ImageData.Paths.Icons.icon_svg_other,
		"Notifications of game events"
	)

	private readonly runeTree: Menu.Node
	public readonly runeState: Menu.Toggle
	public readonly runeRemindState: Menu.Toggle
	public readonly runeRemindRange: Menu.Slider

	public readonly scanState: Menu.Toggle
	public readonly glyphState: Menu.Toggle

	public readonly itemTree: Menu.Node
	public readonly itemState: Menu.Toggle
	public readonly itemsState: Menu.ImageSelector
	public readonly notifCostRange: Menu.Slider
	private readonly items: string[] = [
		"item_tpscroll",
		"item_smoke_of_deceit",
		"item_ward_observer",
		"item_ward_sentry",
		"item_dust",
		"item_blink",
		"item_refresher_shard",
		"item_cheese"
	]

	public readonly spellsTree: Menu.Node
	public readonly spellState: Menu.Toggle
	public readonly spellReadyState: Menu.Toggle
	public readonly spellUsedState: Menu.Toggle
	public readonly spellsState: Menu.ImageSelector
	private readonly spells: string[] = [
		"abaddon_borrowed_time",
		"alchemist_chemical_rage",
		"arc_warden_tempest_double",
		"bane_fiends_grip",
		"batrider_flaming_lasso",
		"beastmaster_primal_roar",
		"centaur_stampede",
		"dark_seer_wall_of_replica",
		"death_prophet_exorcism",
		"disruptor_static_storm",
		"earthshaker_echo_slam",
		"elder_titan_earth_splitter",
		"enigma_black_hole",
		"faceless_void_chronosphere",
		"invoker_sun_strike",
		"jakiro_macropyre",
		"keeper_of_the_light_will_o_wisp",
		"lich_chain_frost",
		"magnataur_reverse_polarity",
		"medusa_stone_gaze",
		"naga_siren_song_of_the_siren",
		"oracle_false_promise",
		"phoenix_supernova",
		"rubick_spell_steal",
		"sandking_epicenter",
		"shadow_shaman_mass_serpent_ward",
		"spectre_haunt",
		"terrorblade_metamorphosis",
		"tidehunter_ravage"
	]

	public readonly lotusTree: Menu.Node
	public readonly lotusState: Menu.Toggle
	public readonly lotusRemindState: Menu.Toggle
	public readonly lotusNumsRange: Menu.Slider
	public readonly lotusRemindRange: Menu.Slider

	public readonly tormentorTree: Menu.Node
	public readonly tormentorState: Menu.Toggle
	public readonly tormentorRemindState: Menu.Toggle
	public readonly tormentorRemindRange: Menu.Slider

	constructor() {
		this.State = this.tree.AddToggle("State")

		this.runeTree = this.tree.AddNode("Runes")
		this.runeState = this.runeTree.AddToggle("Notifications", true, "", -1)
		this.runeRemindState = this.runeTree.AddToggle("Remind", true, "", 1)
		this.runeRemindRange = this.runeTree.AddSlider(
			"Remind before",
			20,
			1,
			60,
			0,
			"Reminds X seconds before spawn",
			2
		)

		this.scanState = this.tree.AddToggle("Scans", true)
		this.glyphState = this.tree.AddToggle("Glyphs", true)

		this.spellsTree = this.tree.AddNode("Spells")
		this.spellState = this.spellsTree.AddToggle("Notifications", true, "", -1)
		this.spellReadyState = this.spellsTree.AddToggle("Ready", true, "", 1)
		this.spellUsedState = this.spellsTree.AddToggle("Used", true, "", 1)
		this.spellsState = this.spellsTree.AddImageSelector(
			"Spells",
			this.spells,
			new Map(this.items.map(spell => [spell, true])),
			"",
			true,
			2
		)

		this.itemTree = this.tree.AddNode("Items")
		this.itemState = this.itemTree.AddToggle("Notifications", true, "", -1)
		this.itemsState = this.itemTree.AddImageSelector(
			"Items",
			this.items,
			new Map(this.items.map(item => [item, true])),
			"",
			true,
			2
		)
		this.notifCostRange = this.itemTree.AddSlider(
			"Item price",
			2500,
			500,
			6000,
			0,
			"Range of cost to notif about item",
			2
		)

		this.lotusTree = this.tree.AddNode("Lotuses")
		this.lotusState = this.lotusTree.AddToggle("Notifications", true, "", -1)
		this.lotusRemindState = this.lotusTree.AddToggle("Remind", true, "", 1)
		this.lotusNumsRange = this.lotusTree.AddSlider(
			"Notify me when more than",
			0,
			0,
			5,
			0,
			"",
			2
		)
		this.lotusRemindRange = this.lotusTree.AddSlider(
			"Remind before",
			10,
			1,
			60,
			0,
			"Reminds in X seconds before spawn",
			2
		)

		this.tormentorTree = this.tree.AddNode("Tormentors")
		this.tormentorState = this.tormentorTree.AddToggle("Notifications", true)
		this.tormentorRemindState = this.tormentorTree.AddToggle("Remind", true, "", 1)
		this.tormentorRemindRange = this.tormentorTree.AddSlider(
			"Remind before",
			40,
			1,
			60,
			0,
			"Reminds in X seconds before spawn",
			2
		)
	}
}
