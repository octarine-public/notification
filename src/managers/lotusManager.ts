import {
	DOTAGameState,
	Entity,
	GameRules,
	Modifier
} from "github.com/octarine-public/wrapper/index"

export class lotusManager {
	public lotus: Nullable<Modifier>
	public readonly entityInstance: Entity
	public SpawnTime = 3 * 60

	constructor(entity: Entity) {
		this.entityInstance = entity
	}

	public get ModuleTime() {
		return (GameRules?.GameTime ?? 0) % Math.floor(this.SpawnTime)
	}

	public get Remaining() {
		return this.SpawnTime - this.ModuleTime
	}

	protected get GameTime() {
		if (GameRules === undefined) {
			return 0
		}
		const gameTime = GameRules.GameTime
		switch (GameRules.GameState) {
			case DOTAGameState.DOTA_GAMERULES_STATE_GAME_IN_PROGRESS:
				return gameTime
			default:
				return gameTime
		}
	}

	public IsTimeForNotif(remindTime?: number) {
		if (remindTime) {
			return this.Remaining > remindTime && this.Remaining < remindTime + 0.05
		}
		return this.Remaining > 0 && this.Remaining < 0.05
	}

	public AddLotus(lotus: Modifier) {
		this.lotus = lotus
	}

	public RemoveLotus() {
		this.lotus = undefined
	}
}
