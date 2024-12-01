import { ImageData, Menu } from "github.com/octarine-public/wrapper/index"

export class MenuManager {
	public readonly State: Menu.Toggle
	private readonly baseNode = Menu.AddEntry("Visual")

	private readonly tree = this.baseNode.AddNode(
		"game notifications",
		ImageData.Paths.Icons.icon_svg_other,
		"notifications of game events"
	)

	private readonly runeTree: Menu.Node
	public readonly runeState: Menu.Toggle
	public readonly runeRemindState: Menu.Toggle

	public readonly smokeState: Menu.Toggle
	public readonly scanState: Menu.Toggle

	public readonly glyphState: Menu.Toggle

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

	public readonly notifCostRange: Menu.Slider
	public readonly itemsState: Menu.ImageSelector

	constructor() {
		this.State = this.tree.AddToggle("State")

		this.runeTree = this.tree.AddNode("Runes notification")
		this.runeState = this.runeTree.AddToggle("State")
		this.runeRemindState = this.runeTree.AddToggle("Remind")

		this.smokeState = this.tree.AddToggle("Smokes")
		this.scanState = this.tree.AddToggle("Scans")

		this.glyphState = this.tree.AddToggle("glyph")

		this.notifCostRange = this.tree.AddSlider(
			"Item price",
			2500,
			500,
			6000,
			0,
			"Range to notif about buy"
		)

		this.itemsState = this.tree.AddImageSelector(
			"Items",
			this.items,
			new Map(this.items.map(item => [item, true]))
		)
	}
}
