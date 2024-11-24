// import "./translations"

import {
	Entity,
	EventsSDK,
	NotificationsSDK,
	Rune
} from "github.com/octarine-public/wrapper/index"

import { MenuManager } from "./menu"
import { GameNotification } from "./notification"

new (class CNotifications {
	private readonly menu = new MenuManager()

	constructor() {
		EventsSDK.on("EntityCreated", this.EntityCreated.bind(this))
	}

	protected EntityCreated(entity: Entity) {
		if (!this.menu.State.value) {
			return
		}
		if (!(entity instanceof Rune) || this.menu.runeState.value) {
			console.log(entity instanceof Rune, this.menu.runeState.value, 1)
			return
		}

		console.log(1)

		NotificationsSDK.Push(
			new GameNotification(
				"soundboard.ay_ay_ay_cn",
				"panorama/images/hud/reborn/rune_doubledamage.vtex_c"
			)
		)
	}
})()
