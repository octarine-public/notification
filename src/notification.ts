import {
	Color,
	DOTAGameUIState,
	GameState,
	Notification,
	Rectangle,
	RendererSDK
} from "github.com/octarine-public/wrapper/index"

export class GameNotification extends Notification {
	constructor(
		playSoundName: string,
		private readonly image: string
	) {
		super({ playSoundName, timeToShow: 5 * 1000 })
	}

	protected get InGameUI(): boolean {
		return GameState.UIState === DOTAGameUIState.DOTA_GAME_UI_DOTA_INGAME
	}

	public OnClick(): boolean {
		return false
	}

	public Draw(position: Rectangle): void {
		if (!this.InGameUI) {
			return
		}

		const alpha = Color.White.SetA(this.Opacity)
		const notificationSize = this.GetNotificationSize(position)
		const textureSize = this.GetTextureSize(notificationSize)
		const textPosition = this.GetTextPosition(notificationSize, textureSize)

		RendererSDK.Image(
			this.BackgroundCover,
			notificationSize.pos1,
			-1,
			notificationSize.Size,
			alpha
		)

		RendererSDK.Image(this.image, textureSize.pos1, -1, textureSize.Size, alpha)

		RendererSDK.Text(
			"lorem ipsum",
			textPosition.pos1,
			Color.White,
			RendererSDK.DefaultFontName,
			16
		)
	}

	private GetTextureSize(position: Rectangle) {
		const result = position.Clone()
		result.Width = position.Width / 3
		result.Height = position.Height
		result.x = position.x
		result.y = position.y
		return result
	}

	private GetNotificationSize(position: Rectangle) {
		const result = position.Clone()
		result.Width = position.Width
		return result
	}

	private GetTextPosition(notificationSize: Rectangle, textureSize: Rectangle) {
		const result = notificationSize.Clone()
		const padding = 10
		result.x = textureSize.x + textureSize.Width + padding
		result.Width = notificationSize.Width - textureSize.Width - padding
		result.y = notificationSize.y + notificationSize.Height / 2 - 8
		return result
	}
}
