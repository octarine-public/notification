import {
	Entity,
	EventsSDK,
	GameRules,
	ImageData,
	NotificationsSDK,
	Rune
} from "github.com/octarine-public/wrapper/index"

import { MenuManager } from "./menu"
import { GameNotification } from "./notification"

new (class CNotifications {
	private readonly menu = new MenuManager()

	constructor() {
		EventsSDK.on("EntityCreated", this.EntityCreated.bind(this))
		EventsSDK.on("PostDataUpdate", this.OnTick.bind(this))
	}

	protected OnTick(dt: number) {
		if (dt === 0 || !this.menu.runeRemindState.value) {
			return
		}

		console.log(this.timeToSpawnRune)
	}

	protected EntityCreated(entity: Entity) {
		if (!this.menu.State.value) {
			return
		}
		if (entity instanceof Rune && this.menu.runeState.value) {
			NotificationsSDK.Push(
				new GameNotification(
					"soundboard.ay_ay_ay_cn",
					ImageData.GetRuneTexture(entity.Name),
					"Spawned"
				)
			)
		}
	}

	private get timeToSpawnRune() {
		// TO DO
		return GameRules?.GameTime
	}
})()
