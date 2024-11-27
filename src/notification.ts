import {
	Color,
	DOTAGameUIState,
	GameState,
	Notification,
	Rectangle,
	RendererSDK
} from "github.com/octarine-public/wrapper/index"

// TODO: rework design
export class GameNotification extends Notification {
	private readonly image: string
	private readonly text: string

	constructor(playSoundName: string, image: string, text: string) {
		super({ playSoundName, timeToShow: 5 * 1000 })
		this.text = text
		this.image = image
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
		const textureSize = this.getImageSize(notificationSize)
		const textPosition = this.getTextPosition(notificationSize, textureSize)

		RendererSDK.Image(
			this.BackgroundCover,
			notificationSize.pos1,
			-1,
			notificationSize.Size,
			alpha
		)

		RendererSDK.Image(this.image, textureSize.pos1, -1, textureSize.Size, alpha)

		RendererSDK.Text(
			this.text,
			textPosition.pos1,
			Color.White,
			RendererSDK.DefaultFontName,
			this.getFontSize(notificationSize)
		)
	}

	private getImageSize(position: Rectangle) {
		const result = position.Clone()
		const scaleFactor = 0.8
		result.Width = (position.Width / 4) * scaleFactor
		result.Height = position.Height * scaleFactor
		result.x = position.x
		result.y = position.y + (position.Height - result.Height) / 2
		return result
	}

	private getNotificationSize(position: Rectangle): Rectangle {
		const result = position.Clone()
		result.Width = position.Width + 80
		return result
	}

	private getTextPosition(notifSize: Rectangle, textureSize: Rectangle): Rectangle {
		const result = notifSize.Clone()
		const padding = this.getPadding(textureSize)
		result.x = textureSize.x + textureSize.Width + padding
		result.Width = notifSize.Width - textureSize.Width - padding
		result.y = notifSize.y + notifSize.Height / 2 - 8
		return result
	}

	private getFontSize(notifSize: Rectangle): number {
		const minWidth = 230
		const maxWidth = 265
		const minFontSize = 14
		const maxFontSize = 32

		if (notifSize.Width <= minWidth) {
			return minFontSize
		}

		if (notifSize.Width >= maxWidth) {
			return maxFontSize
		}

		const scale = (notifSize.Width - minWidth) / (maxWidth - minWidth)
		return Math.round(minFontSize + scale * (maxFontSize - minFontSize))
	}

	private getPadding(notifSize: Rectangle): number {
		const minWidth = 230
		const maxWidth = 265
		const minPadding = 2
		const maxPadding = 28

		if (notifSize.Width <= minWidth) {
			return minPadding
		}

		if (notifSize.Width >= maxWidth) {
			return maxPadding
		}

		const scale = (notifSize.Width - minWidth) / (maxWidth - minWidth)
		return Math.round(minPadding + scale * (maxPadding - minPadding))
	}
}
