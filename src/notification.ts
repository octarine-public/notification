import {
	Color,
	DOTAGameUIState,
	GameState,
	Notification,
	Rectangle,
	RendererSDK
} from "github.com/octarine-public/wrapper/index"

export class GameNotification extends Notification {
	private readonly components: { image?: string; text?: string }[]

	constructor(playSoundName: string, components: { image?: string; text?: string }[]) {
		super({ playSoundName, timeToShow: 5 * 1000 })
		this.components = components
	}

	protected get InGameUI(): boolean {
		return GameState.UIState === DOTAGameUIState.DOTA_GAME_UI_DOTA_INGAME
	}

	public OnClick(): boolean {
		return false
	}

	public Draw(position: Rectangle) {
		if (!this.InGameUI) {
			return
		}

		const alpha = Color.White.SetA(this.Opacity)
		const notificationSize = this.getNotificationSize(position)
		const componentSize = this.getComponentSize(notificationSize)

		RendererSDK.Image(
			this.BackgroundCover,
			notificationSize.pos1,
			-1,
			notificationSize.Size,
			alpha
		)

		this.components.forEach((component, index) => {
			const componentPosition = this.getComponentPosition(
				notificationSize,
				componentSize,
				index
			)

			if (component.image) {
				RendererSDK.Image(
					component.image,
					componentPosition.pos1,
					-1,
					componentSize.Size,
					alpha
				)
			} else if (component.text) {
				RendererSDK.Text(
					component.text,
					componentPosition.pos1,
					Color.White,
					RendererSDK.DefaultFontName,
					this.getFontSize(componentSize)
				)
			}
		})
	}

	private getNotificationSize(position: Rectangle): Rectangle {
		const result = position.Clone()
		result.Width = position.Width + 40
		return result
	}

	private getComponentSize(notifSize: Rectangle): Rectangle {
		const result = notifSize.Clone()
		const scaleFactor = 0.8
		result.Width = (notifSize.Width / 4) * scaleFactor
		result.Height = notifSize.Height * scaleFactor
		return result
	}

	private getComponentPosition(
		notificationSize: Rectangle,
		componentSize: Rectangle,
		index: number
	): Rectangle {
		const result = componentSize.Clone()
		const totalSpacing = notificationSize.Width / 4
		const paddingBetweenComponents = totalSpacing / 3
		const leftRightPadding = totalSpacing / 6

		result.x =
			notificationSize.x +
			leftRightPadding +
			index * (componentSize.Width + paddingBetweenComponents)

		result.y =
			notificationSize.y + (notificationSize.Height - componentSize.Height) / 2

		return result
	}

	private getFontSize(componentSize: Rectangle): number {
		const minWidth = 175
		const maxWidth = 350
		const minFontSize = 22
		const maxFontSize = 42

		if (componentSize.Width <= minWidth) {
			return minFontSize
		}

		if (componentSize.Width >= maxWidth) {
			return maxFontSize
		}

		const scale = (componentSize.Width - minWidth) / (maxWidth - minWidth)
		return Math.round(minFontSize + scale * (maxFontSize - minFontSize))
	}
}
