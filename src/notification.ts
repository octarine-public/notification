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
	private readonly minWidth = 12
	private readonly maxWidth = 20
	private readonly minFontSize = 8
	private readonly maxFontSize = 20
	private readonly scaleFactor = 0.4

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

		if (
			this.components.length === 2 &&
			this.components[0].image &&
			this.components[1].text
		) {
			this.drawImageAndText(notificationSize, componentSize, alpha)
		} else if (
			this.components.length === 3 &&
			this.components[0].image &&
			this.components[1].text &&
			this.components[2].image
		) {
			this.drawImageTextImage(notificationSize, componentSize, alpha)
		}
	}

	private drawImageAndText(
		notificationSize: Rectangle,
		componentSize: Rectangle,
		alpha: Color
	) {
		const [imageComponent, textComponent] = this.components

		const imageSize = this.getImageSize(notificationSize)
		const imagePosition = notificationSize.Clone()
		imagePosition.Width = imageSize.Width
		imagePosition.Height = imageSize.Height
		imagePosition.y += (notificationSize.Height - imageSize.Height) / 2
		imagePosition.x += 8

		const textPosition = notificationSize.Clone()
		textPosition.Width = notificationSize.Width - (imageSize.Width + 8) * 2
		textPosition.x += imageSize.Width + 12
		textPosition.y += notificationSize.Height / 2 - 6

		RendererSDK.Image(
			imageComponent.image!,
			imagePosition.pos1,
			-1,
			imageSize.Size,
			alpha
		)

		RendererSDK.Text(
			textComponent.text!,
			textPosition.pos1,
			Color.White,
			RendererSDK.DefaultFontName,
			this.getFontSize(componentSize),
			18,
			false,
			false
		)
	}

	private drawImageTextImage(
		notificationSize: Rectangle,
		componentSize: Rectangle,
		alpha: Color
	) {
		const [leftImageComponent, textComponent, rightImageComponent] = this.components

		const imageSize = this.getImageSize(notificationSize)

		const leftPadding = imageSize.Width * 0.2
		const rightPadding = imageSize.Width * 0.6

		const leftImagePosition = notificationSize.Clone()
		leftImagePosition.Width = imageSize.Width
		leftImagePosition.Height = imageSize.Height
		leftImagePosition.x += leftPadding
		leftImagePosition.y += (notificationSize.Height - imageSize.Height) / 2

		const textPosition = leftImagePosition.Clone()
		textPosition.Width =
			notificationSize.Width -
			(imageSize.Width + leftPadding + 8 + (imageSize.Width + rightPadding))
		textPosition.x += leftImagePosition.Width + 8
		textPosition.y += notificationSize.Height / 2 - imageSize.Height * 0.5

		if (textComponent.text!.length <= 8) {
			textPosition.x += textPosition.Width / 3 - textComponent.text!.length * 2
		}

		const rightImagePosition = leftImagePosition.Clone()
		rightImagePosition.x =
			notificationSize.x + notificationSize.Width - (imageSize.Width + rightPadding)

		RendererSDK.Image(
			leftImageComponent.image!,
			leftImagePosition.pos1,
			-1,
			imageSize.Size,
			alpha
		)

		RendererSDK.Image(
			rightImageComponent.image!,
			rightImagePosition.pos1,
			-1,
			imageSize.Size,
			alpha
		)

		RendererSDK.Text(
			textComponent.text!,
			textPosition.pos1,
			Color.White,
			RendererSDK.DefaultFontName,
			this.getFontSize(componentSize),
			16,
			false,
			false
		)
	}

	private getImageSize(notificationSize: Rectangle): Rectangle {
		const result = notificationSize.Clone()
		result.Height = (2 / 3) * notificationSize.Height
		result.Width = result.Height
		return result
	}

	private getNotificationSize(position: Rectangle): Rectangle {
		const result = position.Clone()
		result.Width = position.Width + 20
		return result
	}

	private getComponentSize(notifSize: Rectangle): Rectangle {
		const result = notifSize.Clone()
		result.Width = (notifSize.Width / 6) * this.scaleFactor
		result.Height = notifSize.Height * this.scaleFactor
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
