import {
	Ability,
	DOTAGameMode,
	DOTAScriptInventorySlot,
	Entity,
	EventsSDK,
	GameRules,
	Hero,
	ImageData,
	Item,
	LocalPlayer,
	Miniboss,
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

	private readonly spawnTimes: Record<
		"active" | "bounty" | "xp" | "tormentor",
		number
	> = {
		active: 120,
		bounty: 180,
		xp: 420,
		tormentor: 1200
	}

	private readonly heroesData: IHeroesItems[] = []
	private enemyScanCharges = 0
	private lastScanCooldown = 0
	private enemyGlyphCooldown = 0
	private tormentorStatus = 0
	private nextTormentorSpawnTime = 1200

	constructor() {
		EventsSDK.on("Tick", this.Tick.bind(this))
		EventsSDK.on("UnitItemsChanged", this.UnitItemsChanged.bind(this))
		EventsSDK.on("AbilityCooldownChanged", this.AbilityCooldownChanged.bind(this))
		EventsSDK.on("EntityCreated", this.OnEntityCreated.bind(this))
		EventsSDK.on("EntityDestroyed", this.OnEntityDestroyed.bind(this))
		EventsSDK.on("GameStarted", this.GameStarted.bind(this))
	}

	protected GameStarted() {
		if (GameRules === undefined || LocalPlayer === undefined) {
			return
		}
		const isRadiant = LocalPlayer?.Team === 2
		this.enemyScanCharges = isRadiant
			? GameRules.ScanChargesDire
			: GameRules.ScanChargesRadiant
	}

	protected OnEntityDestroyed(entity: Entity) {
		if (entity instanceof Miniboss) {
			this.tormentorStatus = 0
			this.nextTormentorSpawnTime = (GameRules?.GameTime ?? 0) + 1200
		}
	}

	protected OnEntityCreated(entity: Entity) {
		if (entity instanceof Miniboss) {
			this.tormentorStatus = 1
		}

		if (entity instanceof Hero) {
			this.SendNotif(
				"compendium_levelup.vsnd_c",
				[{ image: ImageData.GetRuneTexture("regen") }, { text: "spawned" }],
				"buy"
			)
		}
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
				"compendium_levelup.vsnd_c",
				[
					{
						image: ImageData.GetHeroTexture(ability.OwnerEntity.Name, false)
					},
					{ image: ImageData.Paths.Icons.hardsupport },
					{ image: ImageData.GetSpellTexture(ability.Name) }
				],
				"buy"
			)
		}

		if (ability.CooldownPercent === 0) {
			this.SendNotif(
				"compendium_levelup.vsnd_c",
				[
					{
						image: ImageData.GetHeroTexture(ability.OwnerEntity.Name, false)
					},
					{ image: ImageData.Paths.Icons.icon_timer },
					{ image: ImageData.GetSpellTexture(ability.Name) }
				],
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
									"compendium_levelup.vsnd_c",
									[
										{
											image: ImageData.GetHeroTexture(
												unit.Name,
												false
											)
										},
										{ image: ImageData.Paths.Icons.gold_large },
										{ image: ImageData.GetItemTexture(newItem.Name) }
									],
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

		const remainingTormentor = this.getTormentorRemainingTime(
			this.nextTormentorSpawnTime
		)

		if (this.tormentorStatus === 0 && remainingTormentor === 0) {
			this.tormentorStatus = 1
			this.SendNotif(
				"soundboard.ay_ay_ay_cn",
				[{ image: ImageData.Paths.Icons.chat_arrow_grow }, { text: "tormentor" }],
				"buy"
			)
		}

		if (this.menu.scanState.value) {
			this.SendScanNotif(
				"soundboard.ay_ay_ay_cn",
				[
					{ image: ImageData.Paths.Icons.courier_dire },
					{ image: ImageData.Paths.Icons.hardsupport },
					{ image: ImageData.Paths.Icons.icon_scan }
				],
				"buy"
			)
		}

		if (this.menu.glyphState.value) {
			this.SendGlyphNotif(
				"soundboard.ay_ay_ay_cn",
				[
					{ image: ImageData.Paths.Icons.courier_dire },
					{ image: ImageData.Paths.Icons.icon_timer },
					{ image: ImageData.Paths.Icons.icon_glyph_on }
				],
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
						[
							{ image: ImageData.GetRuneTexture(texture) },
							{ text: "spawned" }
						],
						type
					)
				} else if (
					remainingTime > 20 &&
					remainingTime < 20.1 &&
					this.menu.runeRemindState.value
				) {
					this.SendNotif(
						"soundboard.ay_ay_ay_cn",
						[
							{ image: ImageData.GetRuneTexture(texture) },
							{ text: "20 sec!" }
						],
						type
					)
				}
			}
		}
	}

	protected SendNotif(
		sound: string,
		components: { image?: string; text?: string }[],
		type: "active" | "bounty" | "xp" | "buy",
		checkCooldown: boolean = true
	) {
		if (checkCooldown && type !== "buy" && this.cooldowns[type] !== 0) {
			return
		}
		NotificationsSDK.Push(new GameNotification(sound, components))
		if (type !== "buy") {
			this.cooldowns[type as "active" | "bounty" | "xp"] = GameRules?.GameTime ?? 0
		}
	}

	protected SendGlyphNotif(
		sound: string,
		components: { image?: string; text?: string }[],
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
			this.SendNotif(sound, components, type)
		}

		this.enemyGlyphCooldown = enemyGlyphCooldown
	}

	protected SendScanNotif(
		sound: string,
		components: { image?: string; text?: string }[],
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
			this.lastScanCooldown === 0 &&
			enemyScanCharges === 0 &&
			this.enemyScanCharges === 0
		) {
			return
		}

		if (
			enemyScanCooldown - this.lastScanCooldown > 200 ||
			(this.lastScanCooldown - enemyScanCooldown === this.lastScanCooldown &&
				this.lastScanCooldown !== 0)
		) {
			this.enemyScanCharges++
			this.lastScanCooldown = 0
		}

		if (this.isScanChargeUsed(enemyScanCharges)) {
			this.SendNotif(sound, components, type)
		}

		this.lastScanCooldown = enemyScanCooldown
	}

	// TODO: disable in custom games & rework in other games modes (ex. solo mid 1 vs 1, etc.)
	private getSpawnTime(type: "active" | "bounty" | "xp" | "tormentor"): number {
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

	private getTormentorRemainingTime(spawnTime: number): number {
		return Math.max(0, spawnTime - (GameRules?.GameTime ?? 0))
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
