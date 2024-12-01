import {
	Ability,
	DOTAGameMode,
	DOTAScriptInventorySlot,
	EventsSDK,
	GameRules,
	Hero,
	ImageData,
	Item,
	LocalPlayer,
	NotificationsSDK,
	Unit
} from "github.com/octarine-public/wrapper/index"

import { MenuManager } from "./menu"
import { GameNotification } from "./notification"

interface IHeroesItems {
	unit: Unit
	items: Item[]
}

new (class CNotifications {
	private readonly menu = new MenuManager()
	private cooldowns: Record<"active" | "bounty" | "xp", number> = {
		active: 0,
		bounty: 0,
		xp: 0
	}

	private readonly spawnTimes: Record<"active" | "bounty" | "xp", number> = {
		active: 120,
		bounty: 180,
		xp: 420
	}

	private readonly heroesData: IHeroesItems[] = []
	private enemyScanCharges = 0
	private lastTime = 0
	private enemyGlyphCooldown = 0

	constructor() {
		EventsSDK.on("Tick", this.Tick.bind(this))
		EventsSDK.on("UnitItemsChanged", this.UnitItemsChanged.bind(this))
		EventsSDK.on("AbilityCooldownChanged", this.AbilityCooldownChanged.bind(this))
	}

	protected AbilityCooldownChanged(ability: Ability) {
		if (
			!(ability.OwnerEntity instanceof Hero) ||
			ability.CooldownChangeTime === 0 ||
			!this.menu.spellsState.IsEnabled(ability.Name)
		) {
			return
		}

		if (ability.CooldownPercent === 100) {
			this.SendNotif(
				"soundboard.ay_ay_ay_cn",
				ImageData.GetSpellTexture(ability.Name),
				"used",
				"buy"
			)
		}

		if (ability.CooldownPercent === 0) {
			this.SendNotif(
				"soundboard.ay_ay_ay_cn",
				ImageData.GetSpellTexture(ability.Name),
				"",
				"buy"
			)
		}
	}

	protected UnitItemsChanged(unit: Unit) {
		if (!(unit instanceof Hero) || !unit.IsEnemy() || unit.IsIllusion) {
			return
		}

		const items = this.getItems(unit)
		const heroItems: IHeroesItems = {
			unit,
			items
		}

		const unitInArray = this.heroesData.some(heroData => heroData.unit === unit)

		if (!unitInArray) {
			this.heroesData.push(heroItems)
		} else {
			for (let i = 0; i < this.heroesData.length; i++) {
				if (this.heroesData[i].unit === unit) {
					const pastItems = this.heroesData[i].items
					const presentItems = items

					const newItems = presentItems.filter(
						item =>
							!pastItems.some(
								existingItem => existingItem.Name === item.Name
							)
					)

					if (newItems.length > 0) {
						newItems.forEach(newItem => {
							if (
								this.menu.itemsState.IsEnabled(newItem.Name) ||
								newItem.AbilityData.Cost >= this.menu.notifCostRange.value
							) {
								this.SendNotif(
									"soundboard.ay_ay_ay_cn",
									ImageData.GetItemTexture(newItem.Name),
									"bought",
									"buy",
									false
								)
							}
						})
					}

					this.heroesData[i].items = items
				}
			}
		}
	}

	// TODO: cleanup & refactor
	protected Tick(dt: number) {
		if (dt === 0 || !this.menu.State.value || !GameRules) {
			return
		}

		if (this.menu.scanState.value) {
			this.SendScanNotif(
				"soundboard.ay_ay_ay_cn",
				ImageData.Paths.Icons.icon_scan,
				"Enemy",
				"buy"
			)
		}

		if (this.menu.glyphState.value) {
			this.SendGlyphNotif(
				"soundboard.ay_ay_ay_cn",
				ImageData.Paths.Icons.icon_glyph_on,
				"Enemy",
				"buy"
			)
		}

		if (this.menu.runeState.value) {
			const currentTime = GameRules.GameTime
			Object.keys(this.cooldowns).forEach(key => {
				const type = key as "active" | "bounty" | "xp"
				if (
					this.cooldowns[type] !== 0 &&
					currentTime - this.cooldowns[type] > 2
				) {
					this.cooldowns[type] = 0
				}
			})

			const textureMap: Record<"active" | "bounty" | "xp", string> = {
				active: "regen",
				bounty: "bounty",
				xp: "xp"
			}

			for (const type of ["active", "bounty", "xp"] as const) {
				const remainingTime = this.getRemainingTime(this.getSpawnTime(type))
				const texture = textureMap[type]
				if (remainingTime > 0 && remainingTime < 0.1) {
					this.SendNotif(
						"soundboard.ay_ay_ay_cn",
						ImageData.GetRuneTexture(texture),
						"spawned",
						type
					)
				} else if (
					remainingTime > 20 &&
					remainingTime < 20.1 &&
					this.menu.runeRemindState.value
				) {
					this.SendNotif(
						"soundboard.ay_ay_ay_cn",
						ImageData.GetRuneTexture(texture),
						"20 second!",
						type
					)
				}
			}
		}
	}

	// TODO: rework kd system
	protected SendNotif(
		sound: string,
		image: string,
		text: string,
		type: "active" | "bounty" | "xp" | "buy",
		checkCooldown: boolean = true
	) {
		if (checkCooldown && type !== "buy" && this.cooldowns[type] !== 0) {
			return
		}
		NotificationsSDK.Push(new GameNotification(sound, image, text))
		if (type !== "buy") {
			this.cooldowns[type as "active" | "bounty" | "xp"] = GameRules?.GameTime ?? 0
		}
	}

	protected SendGlyphNotif(
		sound: string,
		image: string,
		text: string,
		type: "active" | "bounty" | "xp" | "buy"
	) {
		if (GameRules === undefined) {
			return
		}

		const isRadiant = LocalPlayer?.Team === 2

		const enemyGlyphCooldown = isRadiant
			? GameRules.GlyphCooldownDire
			: GameRules.GlyphCooldownRadiant

		if (this.isGlyphCooldowned(enemyGlyphCooldown)) {
			this.SendNotif(sound, image, text, type)
		}

		this.enemyGlyphCooldown = enemyGlyphCooldown
	}

	protected SendScanNotif(
		sound: string,
		image: string,
		text: string,
		type: "active" | "bounty" | "xp" | "buy"
	) {
		if (GameRules === undefined) {
			return
		}
		const isRadiant = LocalPlayer?.Team === 2
		const enemyScanCooldown = isRadiant
			? GameRules.ScanCooldownDire
			: GameRules.ScanCooldownRadiant

		const enemyScanCharges = isRadiant
			? GameRules.ScanChargesDire
			: GameRules.ScanChargesRadiant

		if (
			this.lastTime === 0 &&
			enemyScanCharges === 0 &&
			this.enemyScanCharges === 0
		) {
			return
		}

		if (
			enemyScanCooldown - this.lastTime > 200 ||
			(this.lastTime - enemyScanCooldown === this.lastTime && this.lastTime !== 0)
		) {
			this.enemyScanCharges++
			this.lastTime = 0
		}

		if (this.isScanChargeUsed(enemyScanCharges)) {
			this.SendNotif(sound, image, text, type)
		}

		this.lastTime = enemyScanCooldown
	}

	// TODO: disable in custom games & rework in other games modes (ex. solo mid 1 vs 1, etc.)
	private getSpawnTime(type: "active" | "bounty" | "xp"): number {
		const spawn = this.spawnTimes[type]
		return GameRules?.GameMode === DOTAGameMode.DOTA_GAMEMODE_TURBO
			? spawn / 2
			: spawn
	}

	private getModuleTime(spawnTime: number): number {
		return (GameRules?.GameTime ?? 0) % Math.floor(spawnTime)
	}

	private getRemainingTime(spawnTime: number): number {
		return Math.max(0, spawnTime - this.getModuleTime(spawnTime))
	}

	private getItems(unit: Nullable<Unit>): Item[] {
		if (unit === undefined) {
			return []
		}
		const inventory = unit.Inventory
		return inventory
			.GetItems(
				DOTAScriptInventorySlot.DOTA_ITEM_SLOT_1,
				DOTAScriptInventorySlot.DOTA_ITEM_SLOT_9
			)
			.concat(
				inventory.GetItems(
					DOTAScriptInventorySlot.DOTA_ITEM_TP_SCROLL,
					DOTAScriptInventorySlot.DOTA_ITEM_NEUTRAL_SLOT
				)
			)
	}

	private isScanChargeUsed(charge: number): boolean {
		if (this.enemyScanCharges > charge) {
			this.enemyScanCharges = charge
			return true
		}
		return false
	}

	private isGlyphCooldowned(glyphCooldown: number): boolean {
		if (glyphCooldown < this.enemyGlyphCooldown && glyphCooldown === 0) {
			this.enemyGlyphCooldown = glyphCooldown
			return true
		}
		return false
	}
})()
