import "./translations"

import {
	Ability,
	DOTAScriptInventorySlot,
	Entity,
	EntityManager,
	EventsSDK,
	ExecuteOrder,
	GameRules,
	Hero,
	ImageData,
	Item,
	item_tpscroll,
	LocalPlayer,
	MangoTree,
	Menu,
	Miniboss,
	MinibossSpawner,
	Modifier,
	NotificationsSDK,
	npc_dota_hero_rubick,
	rubick_empty1,
	rubick_empty2,
	RuneSpawner,
	RuneSpawnerBounty,
	RuneSpawnerPowerup,
	RuneSpawnerXP,
	Tower,
	Unit
} from "github.com/octarine-public/wrapper/index"

import { Icons } from "./icons"
import { lotusManager } from "./managers/lotusManager"
import { TormentorManager } from "./managers/tormentorManager"
import { towerManager } from "./managers/towerManager"
import { MenuManager } from "./menu"
import { GameNotification } from "./notification"

interface IHeroesItems {
	unit: Unit
	items: Item[]
}

// TODO: CLEANUP
new (class CNotifications {
	private readonly menu = new MenuManager()
	private readonly towerManager = new towerManager()

	private runeSpawnerPowerup: Nullable<RuneSpawnerPowerup>
	private runeSpawnerBounty: Nullable<RuneSpawnerBounty>
	private runeSpawnerXp: Nullable<RuneSpawnerXP>

	private tormentorSpawnerRadiant: Nullable<TormentorManager>
	private tormentorSpawnerDire: Nullable<TormentorManager>

	private readonly heroesData: IHeroesItems[] = []
	private enemyGlyphCooldown = 0

	private readonly modifierRadarName = "modifier_radar_thinker"

	private lotusSpawnerRadiant: Nullable<lotusManager>
	private lotusSpawnerDire: Nullable<lotusManager>

	private stolenSpells: Nullable<Ability>[] = []

	constructor() {
		EventsSDK.on("PostDataUpdate", this.PostDataUpdate.bind(this))
		EventsSDK.on("UnitItemsChanged", this.UnitItemsChanged.bind(this))
		EventsSDK.on("AbilityCooldownChanged", this.AbilityCooldownChanged.bind(this))
		EventsSDK.on("UnitAbilitiesChanged", this.UnitAbilitiesChanged.bind(this))
		EventsSDK.on("EntityCreated", this.OnEntityCreated.bind(this))
		EventsSDK.on("EntityDestroyed", this.OnEntityDestroyed.bind(this))
		EventsSDK.on("ModifierCreated", this.ModifierCreated.bind(this))
		EventsSDK.on("ModifierRemoved", this.ModifierRemoved.bind(this))
		EventsSDK.on("PrepareUnitOrders", this.PrepareUnitOrders.bind(this))
		EventsSDK.on("GameEvent", this.GameEvent.bind(this))
	}

	protected GameEvent(eventName: string, obj: any) {
		if (eventName === "entity_killed") {
			const entity = EntityManager.EntityByIndex(obj.entindex_killed)
			if (entity instanceof Miniboss) {
				if (
					entity.SpawnPosition.x > 0 &&
					entity.SpawnPosition.y > 0 &&
					this.tormentorSpawnerRadiant
				) {
					this.tormentorSpawnerRadiant.UpdateSpawnTime()
				} else if (
					entity.SpawnPosition.x < 0 &&
					entity.SpawnPosition.y < 0 &&
					this.tormentorSpawnerDire
				) {
					this.tormentorSpawnerDire.UpdateSpawnTime()
				}
			}
		}
	}

	protected PrepareUnitOrders(order: ExecuteOrder) {
		if (!order.IsPlayerInput && !order.Issuers[0]?.IsEnemy()) {
			return
		}

		if (
			order.Ability_ instanceof item_tpscroll &&
			order.Ability_.OwnerEntity !== undefined
		) {
			const TowerName = this.towerManager.CoordsInTowerRange(order.Position)
			if (TowerName === undefined) {
				return
			}

			const parts = TowerName.split("_")

			// [team, posName (ex.T2), lane]
			const towerData = [parts[2], "T" + parts[3].replace(/\D/g, ""), parts[4]]
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
				{ text: `TP ${towerData[1]} ${towerData[2]}!` }
			])
		}
	}

	protected UnitAbilitiesChanged(unit: Unit) {
		if (
			!(unit instanceof npc_dota_hero_rubick) ||
			!unit.IsEnemy() ||
			!this.menu.rubickStolenState.value
		) {
			return
		}

		const currentSpells = [unit.Spells[3], unit.Spells[4]]
		const delta = currentSpells.filter(
			spell => spell !== undefined && !this.stolenSpells.includes(spell)
		)
		this.stolenSpells = currentSpells

		if (delta.length > 0) {
			delta.forEach(spell => {
				if (
					spell === undefined ||
					spell instanceof rubick_empty1 ||
					spell instanceof rubick_empty2
				) {
					return
				}
				this.SendNotif([
					{
						image: ImageData.GetHeroTexture(unit.Name, false)
					},
					{ text: Menu.Localization.Localize("Stole") },
					{ image: ImageData.GetSpellTexture(spell.Name) }
				])
			})
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
				{ text: Menu.Localization.Localize("Scanned") },
				{ image: Icons.icon_radar }
			])
		}

		if (
			this.menu.lotusState.value &&
			modifier.Parent instanceof MangoTree &&
			this.lotusSpawnerDire !== undefined &&
			this.lotusSpawnerRadiant !== undefined
		) {
			if (modifier.Parent.Position.x > 0) {
				this.lotusSpawnerDire.AddLotus(modifier)
			} else if (modifier.Parent.Position.x < 0) {
				this.lotusSpawnerRadiant.AddLotus(modifier)
			}
		}
	}

	protected ModifierRemoved(modifier: Modifier) {
		if (
			this.menu.lotusState.value &&
			modifier.Parent instanceof MangoTree &&
			this.lotusSpawnerDire !== undefined &&
			this.lotusSpawnerRadiant !== undefined
		) {
			this.lotusSpawnerDire.RemoveLotus()
			this.lotusSpawnerRadiant.RemoveLotus()
		}
	}

	protected OnEntityCreated(entity: Entity) {
		if (!entity.IsEnemy()) {
			return
		}
		if (entity instanceof MinibossSpawner) {
			if (entity.SpawnPosition.x > 0 && entity.SpawnPosition.y > 0) {
				this.tormentorSpawnerRadiant = new TormentorManager(entity)
			} else if (entity.SpawnPosition.x < 0 && entity.SpawnPosition.y < 0) {
				this.tormentorSpawnerDire = new TormentorManager(entity)
			}
		} else if (entity instanceof RuneSpawnerPowerup) {
			this.runeSpawnerPowerup = entity
		} else if (entity instanceof RuneSpawnerBounty) {
			this.runeSpawnerBounty = entity
		} else if (entity instanceof RuneSpawnerXP) {
			this.runeSpawnerXp = entity
		} else if (entity instanceof Tower) {
			this.towerManager.Add(entity)
		} else if (entity instanceof MangoTree) {
			if (entity.SpawnPosition.x < 0) {
				this.lotusSpawnerRadiant = new lotusManager(entity)
			} else if (entity.SpawnPosition.x > 0) {
				this.lotusSpawnerDire = new lotusManager(entity)
			}
		} else if (entity instanceof npc_dota_hero_rubick) {
			this.stolenSpells.push(undefined, undefined)
		}
	}

	protected OnEntityDestroyed(entity: Entity) {
		if (!entity.IsEnemy()) {
			return
		}
		if (entity instanceof MinibossSpawner) {
			if (entity.SpawnPosition.x > 0 && entity.SpawnPosition.y > 0) {
				this.tormentorSpawnerRadiant = undefined
			} else if (entity.SpawnPosition.x < 0 && entity.SpawnPosition.y < 0) {
				this.tormentorSpawnerDire = undefined
			}
		} else if (entity instanceof RuneSpawnerPowerup) {
			this.runeSpawnerPowerup = undefined
		} else if (entity instanceof RuneSpawnerBounty) {
			this.runeSpawnerBounty = undefined
		} else if (entity instanceof RuneSpawnerXP) {
			this.runeSpawnerXp = undefined
		} else if (entity instanceof MangoTree) {
			if (entity.SpawnPosition.x < 0) {
				this.lotusSpawnerRadiant = undefined
			} else if (entity.SpawnPosition.x > 0) {
				this.lotusSpawnerDire = undefined
			}
		} else if (entity instanceof npc_dota_hero_rubick) {
			this.stolenSpells.remove(undefined, undefined)
		}
	}

	protected AbilityCooldownChanged(ability: Ability) {
		if (
			!(ability.OwnerEntity instanceof Hero) ||
			ability.CooldownChangeTime === 0 ||
			!this.menu.State.value ||
			!this.menu.spellState.value ||
			!this.menu.spellsState.IsEnabled(ability.Name) ||
			!ability.OwnerEntity.IsEnemy() ||
			ability.IsItem
		) {
			return
		}

		if (ability.CooldownPercent === 100 && this.menu.spellUsedState.value) {
			this.SendNotif([
				{
					image: ImageData.GetHeroTexture(ability.OwnerEntity.Name, false)
				},
				{ text: Menu.Localization.Localize("Used") },
				{ image: ImageData.GetSpellTexture(ability.Name) }
			])
		} else if (ability.CooldownPercent === 0 && this.menu.spellReadyState.value) {
			this.SendNotif([
				{
					image: ImageData.GetHeroTexture(ability.OwnerEntity.Name, false)
				},
				{ text: Menu.Localization.Localize("Available") },
				{ image: ImageData.GetSpellTexture(ability.Name) }
			])
		}
	}

	protected UnitItemsChanged(unit: Unit) {
		if (
			!(unit instanceof Hero) ||
			!unit.IsEnemy() ||
			unit.IsIllusion ||
			!this.menu.State.value ||
			!this.menu.itemState.value
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
							{ text: Menu.Localization.Localize("Bought") },
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

		if (this.menu.lotusState.value) {
			const components = [
				{ image: Icons.icon_lotus },
				{
					text: Menu.Localization.Localize("Lotuses spawned!")
				}
			]

			this.TrySendLotusNotif(components)
		}

		if (this.menu.tormentorState.value) {
			const componentsRadiant = [
				{ image: Icons.icon_tormentor },
				{ text: Menu.Localization.Localize("Tormentor spawned!") },
				{ background: Icons.background_radiant }
			]
			const componentsDire = [
				{ image: Icons.icon_tormentor },
				{ text: Menu.Localization.Localize("Tormentor spawned!") },
				{ background: Icons.background_dire }
			]
			this.TrySendTormentorNotif(componentsRadiant, componentsDire)
		}

		if (this.menu.glyphState.value) {
			const background =
				LocalPlayer?.Team === 2 ? Icons.background_dire : Icons.background_radiant
			this.TrySendGlyphNotif([
				{ image: Icons.icon_tower },
				{ text: Menu.Localization.Localize("Glyph avalibale") },
				{ background }
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

				let runeName = ""
				let back = "none"

				if (rune instanceof RuneSpawnerPowerup) {
					runeName = "Powerup"
				} else if (rune instanceof RuneSpawnerBounty) {
					runeName = "Bounty"
					back = Icons.background_bounty
				} else if (rune instanceof RuneSpawnerXP) {
					runeName = "XP"
				}

				const components = [
					{ image: ImageData.GetRuneTexture(RuneTextures[rune.Name]) },
					{
						text: `${runeName} Rune ${Menu.Localization.Localize("spawned!")}`
					},
					{ background: back }
				]

				const componentsRemind = [
					{ image: Icons.icon_rune },
					{
						text: `${Menu.Localization.Localize("To rune:")} ${this.menu.runeRemindRange.value}s`
					}
				]

				this.TrySendRuneNotif(components, componentsRemind, rune)
			}
		}
	}

	protected SendNotif(
		components: { image?: string; text?: string; background?: string }[],
		sound: string = ""
	) {
		NotificationsSDK.Push(new GameNotification(sound, components))
	}

	protected TrySendGlyphNotif(
		components: { image?: string; text?: string; background?: string }[]
	) {
		const enemyGlyphCooldown =
			LocalPlayer?.Team === 2
				? GameRules!.GlyphCooldownDire
				: GameRules!.GlyphCooldownRadiant

		if (this.isGlyphCooldowned(enemyGlyphCooldown)) {
			this.SendNotif(components)
		}

		this.enemyGlyphCooldown = enemyGlyphCooldown
	}

	protected TrySendTormentorNotif(
		componentsRadiant: { image?: string; text?: string; background?: string }[],
		componentsDire: { image?: string; text?: string; background?: string }[]
	) {
		if (
			this.tormentorSpawnerRadiant === undefined ||
			this.tormentorSpawnerDire === undefined
		) {
			return
		}

		if (
			this.tormentorSpawnerRadiant.IsTormentorAlive &&
			!this.tormentorSpawnerRadiant.SpawnOnce
		) {
			this.tormentorSpawnerRadiant.SpawnOnce = true
			this.SendNotif(componentsRadiant, "other")
		}

		if (
			this.tormentorSpawnerDire.IsTormentorAlive &&
			!this.tormentorSpawnerDire.SpawnOnce
		) {
			this.tormentorSpawnerDire.SpawnOnce = true
			this.SendNotif(componentsDire, "other")
		}

		if (
			this.menu.tormentorRemindState.value &&
			this.tormentorSpawnerRadiant.IsTimeForNotif(
				this.menu.tormentorRemindRange.value
			)
		) {
			const remindRadiantComponets = [
				{ image: Icons.icon_tormentor },
				{
					text: `${Menu.Localization.Localize("To tormentors:")} ${this.menu.tormentorRemindRange.value}${Menu.Localization.Localize("s")}`
				},
				{ background: Icons.background_radiant }
			]
			this.SendNotif(remindRadiantComponets, "other")
		}

		if (
			this.menu.tormentorRemindState.value &&
			this.tormentorSpawnerDire.IsTimeForNotif(this.menu.tormentorRemindRange.value)
		) {
			const remindDireComponets = [
				{ image: Icons.icon_tormentor },
				{
					text: `${Menu.Localization.Localize("To tormentors:")} ${this.menu.tormentorRemindRange.value}${Menu.Localization.Localize("s")}`
				},
				{ background: Icons.background_dire }
			]
			this.SendNotif(remindDireComponets, "other")
		}
	}

	protected TrySendLotusNotif(
		components: { image?: string; text?: string; background?: string }[]
	) {
		if (
			this.lotusSpawnerRadiant === undefined ||
			this.lotusSpawnerDire === undefined ||
			this.lotusSpawnerRadiant.lotus === undefined ||
			this.lotusSpawnerDire.lotus === undefined
		) {
			return
		}

		const RadiantNumOfLotuses =
			this.lotusSpawnerRadiant.lotus.StackCount === 6
				? 5
				: this.lotusSpawnerRadiant.lotus.StackCount

		const DireNumsOfLotuses =
			this.lotusSpawnerDire.lotus.StackCount === 6
				? 5
				: this.lotusSpawnerDire.lotus.StackCount

		if (
			this.menu.lotusNumsRange.value <= RadiantNumOfLotuses &&
			this.lotusSpawnerRadiant.RemainingTime > 0 &&
			this.lotusSpawnerRadiant.RemainingTime < 0.05
		) {
			this.SendNotif(components, "other")
		}

		if (
			this.menu.lotusNumsRange.value <= DireNumsOfLotuses &&
			this.lotusSpawnerDire.RemainingTime > 0 &&
			this.lotusSpawnerDire.RemainingTime < 0.05
		) {
			this.SendNotif(components, "other")
		}

		if (
			this.menu.lotusRemindState.value &&
			((this.menu.lotusNumsRange.value <= DireNumsOfLotuses &&
				this.lotusSpawnerDire.RemainingTime > this.menu.lotusRemindRange.value &&
				this.lotusSpawnerDire.RemainingTime <
					this.menu.lotusRemindRange.value + 0.05) ||
				(this.menu.lotusNumsRange.value <= RadiantNumOfLotuses &&
					this.lotusSpawnerRadiant.RemainingTime >
						this.menu.lotusRemindRange.value &&
					this.lotusSpawnerRadiant.RemainingTime <
						this.menu.lotusRemindRange.value + 0.05))
		) {
			const componentRemind = [
				{
					image: Icons.icon_lotus
				},
				{
					text: `${Menu.Localization.Localize("To lotuses:")} ${this.menu.lotusRemindRange.value}${Menu.Localization.Localize("s")}`
				}
			]
			this.SendNotif(componentRemind, "other")
		}
	}

	protected TrySendRuneNotif(
		components: { image?: string; text?: string; background?: string }[],
		componentsRemind: { image?: string; text?: string; background?: string }[],
		rune: RuneSpawner
	) {
		if (
			rune.Remaining > 0 &&
			rune.Remaining < 0.05 &&
			GameRules!.GameTime > 0 &&
			this.menu.runeState.value
		) {
			this.SendNotif(components)
		} else if (
			rune.Remaining > this.menu.runeRemindRange.value &&
			rune.Remaining < this.menu.runeRemindRange.value + 0.05 &&
			this.menu.runeRemindState.value &&
			GameRules!.GameTime > 0
		) {
			this.SendNotif(componentsRemind)
		}
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
