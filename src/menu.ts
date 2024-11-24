import { Menu } from "github.com/octarine-public/wrapper/index"

export class MenuManager {
	public readonly State: Menu.Toggle
	private readonly baseNode = Menu.AddEntry("Visual")

	private readonly tree = this.baseNode.AddNode(
		"game notifications",
		"panorama/images/hud/reborn/item_purchase_bg_psd.vtex_c",
		"notifications of game events"
	)

	private readonly runeTree: Menu.Node
	public readonly runeState: Menu.Toggle

	constructor() {
		this.State = this.tree.AddToggle("State")
		this.runeTree = this.tree.AddNode("Runes notification")
		this.runeState = this.runeTree.AddToggle("State")
	}
}
