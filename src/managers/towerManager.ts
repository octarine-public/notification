import { Tower, Vector3 } from "github.com/octarine-public/wrapper"

export class towerManager {
	private readonly towers: Set<Tower> = new Set<Tower>()

	public Add(tower: Tower) {
		this.towers.add(tower)
	}

	public CoordsInTowerRange(coords: Vector3): Nullable<string> {
		for (const tower of this.towers.values()) {
			if (
				coords.x > tower.Position.x - (tower.BaseAttackRange + 400) &&
				coords.x < tower.Position.x + (tower.BaseAttackRange + 400) &&
				coords.y > tower.Position.y - (tower.BaseAttackRange + 400) &&
				coords.y < tower.Position.y + (tower.BaseAttackRange + 400)
			) {
				return tower.Name
			}
		}

		return undefined
	}
}
