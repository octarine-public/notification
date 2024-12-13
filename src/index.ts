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
	RuneSpawnerBounty,
	RuneSpawnerPowerup,
	RuneSpawnerXP,
	Tower,
	Unit
} from "github.com/octarine-public/wrapper/index"

import { lotusManager } from "./managers/lotusManager"
import { TormentorManager } from "./managers/tormentorManager"
import { towerManager } from "./managers/towerManager"
import { MenuManager } from "./menu"
import { GameNotification } from "./notification"

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

	private tormentorSpawnerRadiant: Nullable<TormentorManager>
	private tormentorSpawnerDire: Nullable<TormentorManager>

	private readonly heroesData: IHeroesItems[] = []
	private enemyGlyphCooldown = 0

	private readonly modifierRadarName = "modifier_radar_thinker"

	private lotusSpawnerRadiant: Nullable<lotusManager>
	private lotusSpawnerDire: Nullable<lotusManager>

	constructor() {
		EventsSDK.on("PostDataUpdate", this.PostDataUpdate.bind(this))
		EventsSDK.on("UnitItemsChanged", this.UnitItemsChanged.bind(this))
		EventsSDK.on("AbilityCooldownChanged", this.AbilityCooldownChanged.bind(this))
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
		if (
			order.IsPlayerInput &&
			order.Issuers[0]?.IsEnemy() &&
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
				this.lotusSpawnerDire = new lotusManager(entity)
			} else if (entity.SpawnPosition.x > 0) {
				this.lotusSpawnerRadiant = new lotusManager(entity)
			}
		}
	}

	protected OnEntityDestroyed(entity: Entity) {
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
		}
	}

	protected AbilityCooldownChanged(ability: Ability) {
		if (
			!(ability.OwnerEntity instanceof Hero) ||
			ability.CooldownChangeTime === 0 ||
			!this.menu.State.value ||
			!this.menu.spellsState.IsEnabled(ability.Name) ||
			!ability.OwnerEntity.IsEnemy() ||
			(ability.IsItem && !(ability instanceof item_tpscroll))
		) {
			return
		}

		if (ability.CooldownPercent === 100 && !(ability instanceof item_tpscroll)) {
			this.SendNotif([
				{
					image: ImageData.GetHeroTexture(ability.OwnerEntity.Name, false)
				},
				{ image: ImageData.Paths.Icons.hardsupport },
				{ image: ImageData.GetSpellTexture(ability.Name) }
			])
		} else if (ability.CooldownPercent === 0) {
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

		if (
			this.menu.lotusState.value &&
			this.lotusSpawnerRadiant !== undefined &&
			this.lotusSpawnerDire !== undefined &&
			this.lotusSpawnerRadiant.lotus !== undefined &&
			this.lotusSpawnerDire.lotus !== undefined
		) {
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
				this.SendNotif(
					[
						{
							text: "lotus"
						},
						{ text: "Radiant" },
						{ text: `${RadiantNumOfLotuses + 1}/6` }
					],
					"other"
				)
			}

			if (
				this.menu.lotusNumsRange.value <= DireNumsOfLotuses &&
				this.lotusSpawnerDire.RemainingTime > 0 &&
				this.lotusSpawnerDire.RemainingTime < 0.05
			) {
				this.SendNotif(
					[
						{
							text: "lotus"
						},
						{ text: "Dire" },
						{ text: `${DireNumsOfLotuses + 1}/6` }
					],
					"other"
				)
			}
		}

		if (
			this.menu.tormentorState.value &&
			this.tormentorSpawnerRadiant !== undefined &&
			this.tormentorSpawnerDire !== undefined
		) {
			if (
				this.tormentorSpawnerRadiant.IsTormentorAlive &&
				!this.tormentorSpawnerRadiant.SpawnOnce
			) {
				this.tormentorSpawnerRadiant.SpawnOnce = true
				this.SendNotif(
					[
						{
							image: `${ImageData.Paths.Images}/fantasy_craft/fantasy_emblem_tormentor_png.vtex_c`
						},
						{ image: ImageData.Paths.Icons.tower_radiant },
						{ image: ImageData.Paths.Icons.arrow_gold_dif }
					],
					"other"
				)
			}

			if (
				this.tormentorSpawnerDire.IsTormentorAlive &&
				!this.tormentorSpawnerDire.SpawnOnce
			) {
				this.tormentorSpawnerDire.SpawnOnce = true
				this.SendNotif(
					[
						{
							image: `${ImageData.Paths.Images}/fantasy_craft/fantasy_emblem_tormentor_png.vtex_c`
						},
						{ image: ImageData.Paths.Icons.tower_dire },
						{ image: ImageData.Paths.Icons.arrow_gold_dif }
					],
					"other"
				)
			}
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

				if (
					rune.Remaining > 0 &&
					rune.Remaining < 0.05 &&
					GameRules.GameTime > 0 &&
					this.menu.runeState.value
				) {
					this.SendNotif([
						{ image: ImageData.GetRuneTexture(RuneTextures[rune.Name]) },
						{ image: ImageData.Paths.Icons.arrow_gold_dif },
						{ image: ImageData.Paths.Icons.arrow_gold_dif }
					])
				} else if (
					rune.Remaining > this.menu.notifRemindRange.value &&
					rune.Remaining < this.menu.notifRemindRange.value + 0.05 &&
					this.menu.runeRemindState.value &&
					GameRules.GameTime > 0
				) {
					this.SendNotif([
						{ image: ImageData.GetRuneTexture(RuneTextures[rune.Name]) },
						{ image: ImageData.Paths.Icons.icon_timer },
						{
							text: Menu.Localization.Localize(
								this.menu.notifRemindRange.value + "\nsec!"
							)
						}
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
