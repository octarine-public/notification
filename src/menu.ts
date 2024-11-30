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

	public smokeState: Menu.Toggle
	public scanState: Menu.Toggle

	public glyphTree: Menu.Node
	public glyphState: Menu.Toggle

	constructor() {
		this.State = this.tree.AddToggle("State")

		this.runeTree = this.tree.AddNode("Runes notification")
		this.runeState = this.runeTree.AddToggle("State")
		this.runeRemindState = this.runeTree.AddToggle("Remind")

		this.smokeState = this.tree.AddToggle("Smokes")
		this.scanState = this.tree.AddToggle("Scans")

		this.glyphTree = this.tree.AddNode("glyph notification")
		this.glyphState = this.tree.AddToggle("glyph")
	}
}
