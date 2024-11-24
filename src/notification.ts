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

		RendererSDK.Image(
			this.BackgroundCover,
			notificationSize.pos1,
			-1,
			notificationSize.Size,
			alpha
		)

		RendererSDK.Text(
			"lorem ipsum",
			notificationSize.pos1,
			Color.White,
			RendererSDK.DefaultFontName,
			16
		)

		RendererSDK.Image(this.image, textureSize.pos1, -1, textureSize.Size, alpha)
	}

	private GetTextureSize(position: Rectangle) {
		const result = position.Clone()
		result.Width = position.Width / 2
		result.Height = position.Height
		result.x = position.x + position.Width / 2 - result.Width / 2
		result.y = position.y
		return result
	}

	private GetNotificationSize(position: Rectangle) {
		const result = position.Clone()
		result.x = position.x + position.Width / 2
		result.Width = position.Width / 2
		return result
	}
}
