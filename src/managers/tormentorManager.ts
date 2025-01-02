import {
	DOTAGameState,
	Entity,
	GameRules
} from "github.com/octarine-public/wrapper/index"

export class TormentorManager {
	public LastSpawnTime = -1
	public NextSpawnTime = 20 * 60
	public SpawnTime = 10 * 60
	public EntityInstance: Entity
	public SpawnOnce = false

	constructor(entity: Entity) {
		this.EntityInstance = entity
	}

	public get ModuleTime() {
		return this.GameTime % this.MaxDuration("seconds")
	}

	public get Remaining() {
		return Math.max(this.NextSpawnTime - this.GameTime, 0)
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

	protected get SpawnsTime(): [number, number] {
		if (GameRules === undefined) {
			return [0, 0]
		}

		let lastSpawnTime = this.LastSpawnTime
		let nextSpawnTime = this.NextSpawnTime

		if (lastSpawnTime < 0) {
			lastSpawnTime = 20 * 60
		}

		if (nextSpawnTime < 0) {
			nextSpawnTime = lastSpawnTime + this.SpawnTime
		}

		return [lastSpawnTime, nextSpawnTime]
	}

	protected MaxDuration(timeType: "seconds" | "minutes" = "minutes"): number {
		const [lastSpawnTime, nextSpawnTime] = this.SpawnsTime
		const timeFormat = timeType === "seconds" ? 1 : 60
		return Math.max((nextSpawnTime - lastSpawnTime) / timeFormat, 0)
	}

	public UpdateSpawnTime() {
		this.SpawnOnce = false
		const currentTime = this.GameTime
		this.LastSpawnTime = currentTime
		this.NextSpawnTime = currentTime + this.SpawnTime
	}

	public IsTimeForNotif(remindTime?: number): boolean {
		if (remindTime) {
			return (
				this.NextSpawnTime - this.GameTime > remindTime &&
				this.NextSpawnTime - this.GameTime < remindTime + 0.05
			)
		}
		return this.IsTormentorAlive && !this.SpawnOnce
	}

	public get IsTormentorAlive(): boolean {
		return this.GameTime >= this.NextSpawnTime
	}
}
