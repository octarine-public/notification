import {
	Ability,
	DOTAScriptInventorySlot,
	Entity,
	EventsSDK,
	ExecuteOrder,
	GameRules,
	Hero,
	ImageData,
	Item,
	item_tpscroll,
	LocalPlayer,
	Miniboss,
	Modifier,
	NotificationsSDK,
	RuneSpawnerBounty,
	RuneSpawnerPowerup,
	RuneSpawnerXP,
	Tower,
	Unit
} from "github.com/octarine-public/wrapper/index"

import { MenuManager } from "./menu"
import { GameNotification } from "./notification"
import { towerManager } from "./towerManager"

interface IHeroesItems {
	unit: Unit
	items: Item[]
}

new (class CNotifications {
	private readonly menu = new MenuManager()
	private readonly towerManager = new towerManager()

	private runeSpawnerPowerup: Nullable<RuneSpawnerPowerup>
	private runeSpawnerBounty: Nullable<RuneSpawnerBounty>
	private runeSpawnerXp: Nullable<RuneSpawnerXP>
	private readonly heroesData: IHeroesItems[] = []
	private readonly modifierRadarName = "modifier_radar_thinker"
	private enemyGlyphCooldown = 0
	private nextTormentorSpawnTime = 1200
	private isTormentorAlive = false

	constructor() {
		EventsSDK.on("PostDataUpdate", this.PostDataUpdate.bind(this))
		EventsSDK.on("UnitItemsChanged", this.UnitItemsChanged.bind(this))
		EventsSDK.on("AbilityCooldownChanged", this.AbilityCooldownChanged.bind(this))
		EventsSDK.on("EntityCreated", this.OnEntityCreated.bind(this))
		EventsSDK.on("EntityDestroyed", this.OnEntityDestroyed.bind(this))
		EventsSDK.on("ModifierCreated", this.ModifierCreated.bind(this))
		EventsSDK.on("PrepareUnitOrders", this.PrepareUnitOrders.bind(this))
	}

	protected PrepareUnitOrders(order: ExecuteOrder) {
		if (
			order.IsPlayerInput &&
			order.Issuers[0].IsEnemy() &&
			order.Ability_ instanceof item_tpscroll &&
			order.Ability_.OwnerEntity !== undefined
		) {
			const fullNpcName = this.towerManager.CoordsInTowerRange(order.Position)
			if (fullNpcName === undefined) {
				return
			}
			const parts = fullNpcName.split("_")
			const towerData = [parts[2], "T" + parts[3].replace(/\D/g, ""), parts[4]] // [team, posName (ex.T2), lane]
			if (towerData[2] === undefined) {
				towerData[2] = "base"
			}
			this.SendNotif([
				{
					image: ImageData.GetHeroTexture(
						order.Ability_.OwnerEntity.Name,
						false
					)
				},
				{ image: ImageData.GetSpellTexture(order.Ability_.Name) },
				{ text: `${towerData[1]}\n${towerData[2]}` }
			])
		}
	}

	protected ModifierCreated(modifier: Modifier) {
		if (
			modifier.Name === this.modifierRadarName &&
			modifier.Caster !== undefined &&
			modifier.Caster.IsEnemy() &&
			modifier.IsValid &&
			this.menu.scanState.value
		) {
			this.SendNotif([
				{ image: ImageData.GetHeroTexture(modifier.Caster.Name) },
				{ image: ImageData.Paths.Icons.hardsupport },
				{ image: ImageData.Paths.Icons.icon_scan }
			])
		}
	}

	protected OnEntityCreated(entity: Entity) {
		if (entity instanceof Miniboss) {
			this.isTormentorAlive = true
		} else if (entity instanceof RuneSpawnerPowerup) {
			this.runeSpawnerPowerup = entity
		} else if (entity instanceof RuneSpawnerBounty) {
			this.runeSpawnerBounty = entity
		} else if (entity instanceof RuneSpawnerXP) {
			this.runeSpawnerXp = entity
		} else if (entity instanceof Tower) {
			this.towerManager.Add(entity)
		}
	}

	protected OnEntityDestroyed(entity: Entity) {
		if (entity instanceof Miniboss) {
			this.isTormentorAlive = false
			this.nextTormentorSpawnTime = (GameRules?.GameTime ?? 0) + 1200
		} else if (entity instanceof RuneSpawnerPowerup) {
			this.runeSpawnerPowerup = undefined
		} else if (entity instanceof RuneSpawnerBounty) {
			this.runeSpawnerBounty = undefined
		} else if (entity instanceof RuneSpawnerXP) {
			this.runeSpawnerXp = undefined
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
			this.SendNotif([
				{
					image: ImageData.GetHeroTexture(ability.OwnerEntity.Name, false)
				},
				{ image: ImageData.Paths.Icons.hardsupport },
				{ image: ImageData.GetSpellTexture(ability.Name) }
			])
		} else if (ability.CooldownPercent === 0 && !(ability instanceof item_tpscroll)) {
			this.SendNotif([
				{
					image: ImageData.GetHeroTexture(ability.OwnerEntity.Name, false)
				},
				{ image: ImageData.Paths.Icons.icon_timer },
				{ image: ImageData.GetSpellTexture(ability.Name) }
			])
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
						this.SendNotif([
							{ image: ImageData.GetHeroTexture(unit.Name, false) },
							{ image: ImageData.Paths.Icons.gold_large },
							{ image: ImageData.GetItemTexture(newItem.Name) }
						])
					}
				})
			}

			heroItems.items = items
		}
	}

	protected PostDataUpdate(dt: number) {
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

		if (this.menu.glyphState.value) {
			const isRadiant = LocalPlayer.Team === 2

			const towerIcon = isRadiant
				? ImageData.Paths.Icons.tower_dire
				: ImageData.Paths.Icons.tower_radiant

			this.TrySendGlyphNotif([
				{ image: towerIcon },
				{ image: ImageData.Paths.Icons.icon_timer },
				{ image: ImageData.Paths.Icons.icon_glyph_on }
			])
		}

		if (this.menu.runeState.value) {
			const RuneTextures: { [key: string]: string } = {
				dota_item_rune_spawner_powerup: "regen",
				dota_item_rune_spawner_bounty: "bounty",
				dota_item_rune_spawner_xp: "xp"
			}

			for (const rune of [
				this.runeSpawnerPowerup,
				this.runeSpawnerBounty,
				this.runeSpawnerXp
			] as const) {
				if (rune === undefined) {
					break
				}

				if (rune.Remaining > 0 && rune.Remaining < 0.05) {
					this.SendNotif([
						{ image: ImageData.GetRuneTexture(RuneTextures[rune.Name]) },
						{ image: ImageData.Paths.Icons.arrow_gold_dif }
					])
				} else if (
					rune.Remaining > 20 &&
					rune.Remaining < 20.05 &&
					this.menu.runeRemindState.value
				) {
					this.SendNotif([
						{ image: ImageData.GetRuneTexture(RuneTextures[rune.Name]) },
						{ image: ImageData.Paths.Icons.icon_timer },
						{ text: "20\nsec!" }
					])
				}
			}
		}
	}

	protected SendNotif(
		components: { image?: string; text?: string }[],
		sound: string = ""
	) {
		NotificationsSDK.Push(new GameNotification(sound, components))
	}

	protected TrySendGlyphNotif(components: { image?: string; text?: string }[]) {
		if (GameRules === undefined) {
			return
		}

		const isRadiant = LocalPlayer?.Team === 2

		const enemyGlyphCooldown = isRadiant
			? GameRules.GlyphCooldownDire
			: GameRules.GlyphCooldownRadiant

		if (this.isGlyphCooldowned(enemyGlyphCooldown)) {
			this.SendNotif(components)
		}

		this.enemyGlyphCooldown = enemyGlyphCooldown
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

	private isGlyphCooldowned(realGlyphCooldown: number): boolean {
		if (realGlyphCooldown < this.enemyGlyphCooldown && realGlyphCooldown === 0) {
			this.enemyGlyphCooldown = realGlyphCooldown
			return true
		}
		return false
	}
})()
