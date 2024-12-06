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
	private nextTormentorSpawnTime = 1200
	private isTormentorAlive = false

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
		const isRadiant = LocalPlayer.Team === 2
		this.enemyScanCharges = isRadiant
			? GameRules.ScanChargesDire
			: GameRules.ScanChargesRadiant
	}

	protected OnEntityDestroyed(entity: Entity) {
		if (entity instanceof Miniboss) {
			this.isTormentorAlive = false
			this.nextTormentorSpawnTime = (GameRules?.GameTime ?? 0) + 1200
		}
	}

	protected OnEntityCreated(entity: Entity) {
		if (entity instanceof Miniboss) {
			this.isTormentorAlive = true
		}
	}

	protected AbilityCooldownChanged(ability: Ability) {
		if (
			!(ability.OwnerEntity instanceof Hero) ||
			ability.CooldownChangeTime === 0 ||
			!this.menu.State.value ||
			!this.menu.spellsState.IsEnabled(ability.Name) ||
			!ability.OwnerEntity.IsEnemy()
		) {
			return
		}

		if (ability.CooldownPercent === 100) {
			this.SendNotif(
				[
					{
						image: ImageData.GetHeroTexture(ability.OwnerEntity.Name, false)
					},
					{ image: ImageData.Paths.Icons.hardsupport },
					{ image: ImageData.GetSpellTexture(ability.Name) }
				],
				"other"
			)
		} else if (ability.CooldownPercent === 0) {
			this.SendNotif(
				[
					{
						image: ImageData.GetHeroTexture(ability.OwnerEntity.Name, false)
					},
					{ image: ImageData.Paths.Icons.icon_timer },
					{ image: ImageData.GetSpellTexture(ability.Name) }
				],
				"other"
			)
		}
	}

	protected UnitItemsChanged(unit: Unit) {
		if (
			!(unit instanceof Hero) ||
			!unit.IsEnemy() ||
			unit.IsIllusion ||
			!this.menu.State.value
		) {
			return
		}

		const items = this.getItems(unit)
		const heroItems = this.heroesData.find(heroData => heroData.unit === unit)

		if (!heroItems) {
			this.heroesData.push({ unit, items })
		} else {
			const newItems = items.filter(
				item =>
					!heroItems.items.some(existingItem => existingItem.Name === item.Name)
			)

			if (newItems.length > 0) {
				newItems.forEach(newItem => {
					if (
						this.menu.itemsState.IsEnabled(newItem.Name) ||
						newItem.AbilityData.Cost >= this.menu.notifCostRange.value
					) {
						this.SendNotif(
							[
								{ image: ImageData.GetHeroTexture(unit.Name, false) },
								{ image: ImageData.Paths.Icons.gold_large },
								{ image: ImageData.GetItemTexture(newItem.Name) }
							],
							"other",
							false
						)
					}
				})
			}

			heroItems.items = items
		}
	}

	protected Tick(dt: number) {
		if (
			dt === 0 ||
			!this.menu.State.value ||
			GameRules === undefined ||
			LocalPlayer === undefined
		) {
			return
		}

		const tormentorSpawned =
			this.getTormentorRemainingTime(this.nextTormentorSpawnTime) === 0 &&
			!this.isTormentorAlive

		if (tormentorSpawned) {
			this.isTormentorAlive = true
			// TODO: find tormentor img
			this.SendNotif(
				[
					{ text: "tormentor" },
					{ text: " " },
					{ image: ImageData.Paths.Icons.arrow_gold_dif }
				],
				"other"
			)
		}

		if (this.menu.scanState.value) {
			const isRadiant = LocalPlayer.Team === 2

			const towerIcon = isRadiant
				? ImageData.Paths.Icons.tower_dire
				: ImageData.Paths.Icons.tower_radiant

			// TODO: fix
			this.TrySendScanNotif(
				[
					{ image: towerIcon },
					{ image: ImageData.Paths.Icons.hardsupport },
					{ image: ImageData.Paths.Icons.icon_scan }
				],
				"other"
			)
		}

		if (this.menu.glyphState.value) {
			const isRadiant = LocalPlayer.Team === 2

			const towerIcon = isRadiant
				? ImageData.Paths.Icons.tower_dire
				: ImageData.Paths.Icons.tower_radiant

			this.TrySendGlyphNotif(
				[
					{ image: towerIcon },
					{ image: ImageData.Paths.Icons.icon_timer },
					{ image: ImageData.Paths.Icons.icon_glyph_on }
				],
				"other"
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
						[
							{ image: ImageData.GetRuneTexture(texture) },
							{ image: ImageData.Paths.Icons.arrow_gold_dif }
						],
						type
					)
				} else if (
					remainingTime > 20 &&
					remainingTime < 20.1 &&
					this.menu.runeRemindState.value
				) {
					this.SendNotif(
						[
							{ image: ImageData.GetRuneTexture(texture) },
							{ image: ImageData.Paths.Icons.icon_timer },
							{ text: "20\nsec!" }
						],
						type
					)
				}
			}
		}
	}

	protected SendNotif(
		components: { image?: string; text?: string }[],
		type: "active" | "bounty" | "xp" | "other",
		checkCooldown: boolean = true,
		sound: string = ""
	) {
		if (checkCooldown && type !== "other" && this.cooldowns[type] !== 0) {
			return
		}
		NotificationsSDK.Push(new GameNotification(sound, components))
		if (type !== "other") {
			this.cooldowns[type as "active" | "bounty" | "xp"] = GameRules?.GameTime ?? 0
		}
	}

	protected TrySendGlyphNotif(
		components: { image?: string; text?: string }[],
		type: "active" | "bounty" | "xp" | "other"
	) {
		if (GameRules === undefined) {
			return
		}

		const isRadiant = LocalPlayer?.Team === 2

		const enemyGlyphCooldown = isRadiant
			? GameRules.GlyphCooldownDire
			: GameRules.GlyphCooldownRadiant

		if (this.isGlyphCooldowned(enemyGlyphCooldown)) {
			this.SendNotif(components, type, false)
		}

		this.enemyGlyphCooldown = enemyGlyphCooldown
	}

	protected TrySendScanNotif(
		components: { image?: string; text?: string }[],
		type: "active" | "bounty" | "xp" | "other"
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
			this.SendNotif(components, type)
		}

		this.lastScanCooldown = enemyScanCooldown
	}

	private getSpawnTime(type: "active" | "bounty" | "xp" | "tormentor"): number {
		const spawn = this.spawnTimes[type]
		const bannedGamesModes = [
			DOTAGameMode.DOTA_GAMEMODE_1V1MID,
			DOTAGameMode.DOTA_GAMEMODE_CUSTOM,
			DOTAGameMode.DOTA_GAMEMODE_EVENT,
			DOTAGameMode.DOTA_GAMEMODE_NONE,
			DOTAGameMode.DOTA_GAMEMODE_INTRO,
			DOTAGameMode.DOTA_GAMEMODE_HW,
			DOTAGameMode.DOTA_GAMEMODE_XMAS,
			DOTAGameMode.DOTA_GAMEMODE_TUTORIAL,
			DOTAGameMode.DOTA_GAMEMODE_FH
		]
		if (GameRules === undefined || bannedGamesModes.includes(GameRules.GameMode)) {
			return -1
		}
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

	private isScanChargeUsed(realcharges: number): boolean {
		if (this.enemyScanCharges > realcharges) {
			this.enemyScanCharges = realcharges
			return true
		}
		return false
	}

	private isGlyphCooldowned(realGlyphCooldown: number): boolean {
		if (realGlyphCooldown < this.enemyGlyphCooldown && realGlyphCooldown === 0) {
			this.enemyGlyphCooldown = realGlyphCooldown
			return true
		}
		return false
	}
})()
