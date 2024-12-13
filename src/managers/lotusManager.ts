import {
	DOTAGameMode,
	Entity,
	GameRules,
	Modifier
} from "github.com/octarine-public/wrapper/index"

export class lotusManager {
	public lotus: Nullable<Modifier>
	public readonly entityInstance: Entity
	private readonly spawn = 3 * 60

	constructor(entity: Entity) {
		this.entityInstance = entity
	}

	protected get SpawnTime() {
		if (GameRules === undefined) {
			return 0
		}
		return GameRules.GameMode === DOTAGameMode.DOTA_GAMEMODE_TURBO
			? this.spawn / 2
			: this.spawn
	}

	protected get ModuleTime() {
		return (GameRules?.GameTime ?? 0) % Math.floor(this.SpawnTime)
	}

	public get RemainingTime() {
		return this.SpawnTime - this.ModuleTime
	}

	public AddLotus(lotus: Modifier) {
		this.lotus = lotus
	}

	public RemoveLotus() {
		this.lotus = undefined
	}
}
