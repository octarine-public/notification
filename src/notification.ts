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
	private readonly minWidth = 175
	private readonly maxWidth = 350
	private readonly minFontSize = 22
	private readonly maxFontSize = 48
	private readonly scaleFactor = 0.8

	constructor(playSoundName: string, components: { image?: string; text?: string }[]) {
		super({ playSoundName, timeToShow: 5000 })
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
		result.Width = (notifSize.Width / 4) * this.scaleFactor
		result.Height = notifSize.Height * this.scaleFactor
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
		if (componentSize.Width <= this.minWidth) {
			return this.minFontSize
		}

		if (componentSize.Width >= this.maxWidth) {
			return this.maxFontSize
		}

		const scale =
			(componentSize.Width - this.minWidth) / (this.maxWidth - this.minWidth)

		return Math.round(
			this.minFontSize + scale * (this.maxFontSize - this.minFontSize)
		)
	}
}
