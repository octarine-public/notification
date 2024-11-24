// import "./translations"

import {
	Entity,
	EventsSDK,
	ExecuteOrder,
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
		EventsSDK.on("PrepareUnitOrders", this.PrepareUnitOrders.bind(this))
		EventsSDK.on("GameEvent", this.GameEvent.bind(this))
	}

	protected EntityCreated(entity: Entity) {
		if (!this.menu.State.value) {
			return
		}
		if (entity instanceof Rune && this.menu.runeState.value) {
			NotificationsSDK.Push(
				new GameNotification(
					"soundboard.ay_ay_ay_cn",
					ImageData.GetRuneTexture("regen")
				)
			)
		}
	}

	protected PrepareUnitOrders(order: ExecuteOrder) {
		if (!order.IsPlayerInput) {
			return
		}
		console.log(order, "order")
	}

	protected GameEvent(eventName: string, obj: any) {
		console.log(eventName, obj)
	}
})()
