// import "./translations"

import { MenuManager } from "./menu"

new (class CNotifications {
	private readonly menu = new MenuManager()

	constructor() {}
})()
