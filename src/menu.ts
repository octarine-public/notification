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
	public readonly rubickStolenState: Menu.Toggle

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
		"enigma_black_hole",
		"faceless_void_chronosphere",
		"invoker_sun_strike",
		"disruptor_static_storm",
		"earthshaker_echo_slam",
		"sandking_epicenter",
		"terrorblade_metamorphosis",
		"magnataur_reverse_polarity",
		"abaddon_borrowed_time",
		"bane_fiends_grip",
		"beastmaster_primal_roar",
		"batrider_flaming_lasso",
		"centaur_stampede",
		"death_prophet_exorcism"
	]

	public readonly lotusTree: Menu.Node
	public readonly lotusState: Menu.Toggle
	public readonly lotusNumsRange: Menu.Slider
	public readonly lotusRemindRange: Menu.Slider

	public readonly tormentorTree: Menu.Node
	public readonly tormentorState: Menu.Toggle
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
		this.rubickStolenState = this.tree.AddToggle(
			"Stolen Spells",
			true,
			"What spell has been stolen by Rubick"
		)

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
		this.lotusNumsRange = this.lotusTree.AddSlider(
			"Notify me when more than",
			0,
			1,
			6,
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
