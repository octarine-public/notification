import {
	Color,
	DOTAGameUIState,
	GameState,
	Notification,
	Rectangle,
	RendererSDK
} from "github.com/octarine-public/wrapper/index"

export class GameNotification extends Notification {
	private readonly components: { image?: string; text?: string; background?: string }[]
	private readonly minWidth = 166
	private readonly maxWidth = 312
	private readonly minFontSize = 8
	private readonly maxFontSize = 20

	constructor(
		playSoundName: string,
		components: { image?: string; text?: string; background?: string }[]
	) {
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

		RendererSDK.Image(
			this.BackgroundCover,
			notificationSize.pos1,
			-1,
			notificationSize.Size,
			alpha
		)

		if (
			(this.components.length === 2 &&
				this.components[0].image &&
				this.components[1].text) ||
			(this.components.length === 3 &&
				this.components[0].image &&
				this.components[1].text &&
				this.components[2].background)
		) {
			this.drawImageAndText(notificationSize, alpha)
		} else if (
			this.components.length === 3 &&
			this.components[0].image &&
			this.components[1].text &&
			this.components[2].image
		) {
			this.drawImageTextImage(notificationSize, alpha)
		} else if (
			this.components.length === 4 &&
			this.components[0].image &&
			this.components[1].text &&
			this.components[2].image &&
			this.components[3].text
		) {
			this.drawImageTextImageText(notificationSize, alpha)
		} else if (
			this.components.length === 4 &&
			this.components[0].image &&
			this.components[1].text &&
			this.components[2].text &&
			this.components[3].background
		) {
			this.drawImageTextText(notificationSize, alpha)
		}
	}

	private drawImageTextText(notificationSize: Rectangle, alpha: Color) {
		const [leftImageComponent, text1Component, text2Component, back] = this.components

		const imageSize = this.getImageSize(notificationSize)
		const textHeightPaddings = notificationSize.Height / 2 - 6
		const leftPadding = imageSize.Width * 0.2
		const componetsMargin = this.getComponentsMargin(notificationSize)
		const letterWidth = this.getLetterWidth(notificationSize)
		const text1 = text1Component.text!
		const text2 = text2Component.text!
		const lowLetters = this.countLowLetters(text1)

		const leftImagePosition = notificationSize.Clone()
		leftImagePosition.Width = imageSize.Width
		leftImagePosition.Height = imageSize.Height
		leftImagePosition.x += leftPadding
		leftImagePosition.y += (notificationSize.Height - imageSize.Height) / 2

		const textPosition = notificationSize.Clone()
		textPosition.Width = letterWidth * (text1.length - lowLetters)
		textPosition.x = leftImagePosition.x + leftImagePosition.Width + componetsMargin
		textPosition.y += textHeightPaddings

		const backPosition = notificationSize.Clone()
		backPosition.Width = notificationSize.Width / 5
		backPosition.Height = notificationSize.Height
		backPosition.x =
			notificationSize.x + (notificationSize.Width - backPosition.Width)

		const backTextPos = notificationSize.Clone()
		backTextPos.x = textPosition.x + textPosition.Width + componetsMargin
		backTextPos.y += textHeightPaddings

		RendererSDK.Image(
			leftImageComponent.image!,
			leftImagePosition.pos1,
			-1,
			imageSize.Size,
			alpha
		)

		RendererSDK.Text(
			text1,
			textPosition.pos1,
			Color.White,
			RendererSDK.DefaultFontName,
			this.getFontSize(notificationSize) * 1.3,
			18
		)

		RendererSDK.Image(
			back.background!,
			backPosition.pos1,
			-1,
			backPosition.Size,
			alpha
		)

		RendererSDK.Text(
			text2,
			backTextPos.pos1,
			Color.White,
			RendererSDK.DefaultFontName,
			this.getFontSize(notificationSize) * 1.5,
			18,
			false,
			true
		)
	}

	private drawImageTextImageText(notificationSize: Rectangle, alpha: Color) {
		const [image1, text1, image2, text2] = this.components

		const imageSize = this.getImageSize(notificationSize)
		const componetsMargin = this.getComponentsMargin(notificationSize)
		const textHeightPaddings = notificationSize.Height / 2 - 6
		const text1Content = text1.text!
		const letterWidth = this.getLetterWidth(notificationSize)
		const lowLetters = this.countLowLetters(text1Content)
		const imagesMargin = imageSize.Width * 0.2

		const image1Position = notificationSize.Clone()
		image1Position.Width = imageSize.Width
		image1Position.Height = imageSize.Height
		image1Position.x += imagesMargin
		image1Position.y += (notificationSize.Height - imageSize.Height) / 2

		const text1Position = notificationSize.Clone()
		text1Position.Width = letterWidth * (text1Content.length - lowLetters)
		text1Position.x = image1Position.x + image1Position.Width + componetsMargin
		text1Position.y += textHeightPaddings

		const image2Position = notificationSize.Clone()
		image2Position.Width = imageSize.Width
		image2Position.Height = imageSize.Height
		image2Position.x = text1Position.x + text1Position.Width + componetsMargin
		image2Position.y += (notificationSize.Height - imageSize.Height) / 2

		const text2Position = notificationSize.Clone()
		text2Position.Width =
			notificationSize.Width -
			(image1Position.Width + text1Position.Width + image2Position.Width)
		text2Position.x = image2Position.x + image2Position.Width + componetsMargin
		text2Position.y += textHeightPaddings

		RendererSDK.Image(image1.image!, image1Position.pos1, -1, imageSize.Size, alpha)

		RendererSDK.Text(
			text1.text!,
			text1Position.pos1,
			Color.White,
			RendererSDK.DefaultFontName,
			this.getFontSize(notificationSize),
			18
		)

		RendererSDK.Image(image2.image!, image2Position.pos1, -1, imageSize.Size, alpha)

		RendererSDK.Text(
			text2.text!,
			text2Position.pos1,
			Color.White,
			RendererSDK.DefaultFontName,
			this.getFontSize(notificationSize),
			18
		)
	}

	private drawImageAndText(notificationSize: Rectangle, alpha: Color) {
		const [imageComponent, textComponent, background] = this.components

		const imageSize = this.getImageSize(notificationSize)
		const textHeightPaddings = notificationSize.Height / 2 - 6
		const imagesMargin = imageSize.Width * 0.2
		const componetsMargin = this.getComponentsMargin(notificationSize)
		const letterWidth = this.getLetterWidth(notificationSize)
		const text = textComponent.text!
		const lowLetters = this.countLowLetters(text)

		const imagePosition = notificationSize.Clone()
		imagePosition.Width = imageSize.Width
		imagePosition.Height = imageSize.Height
		imagePosition.x += imagesMargin + componetsMargin
		imagePosition.y += (notificationSize.Height - imageSize.Height) / 2

		const textPosition = notificationSize.Clone()
		textPosition.Width = letterWidth * (text.length - lowLetters)
		textPosition.x = imagePosition.x + imagePosition.Height + componetsMargin
		textPosition.y += textHeightPaddings

		const backPosition = notificationSize.Clone()
		backPosition.Width = notificationSize.Width / 5
		backPosition.Height = notificationSize.Height

		if (background && background.background !== "none") {
			RendererSDK.Image(
				background.background!,
				backPosition.pos1,
				-1,
				backPosition.Size,
				alpha
			)
		}

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
			this.getFontSize(notificationSize),
			18
		)
	}

	private drawImageTextImage(notificationSize: Rectangle, alpha: Color) {
		const [leftImageComponent, textComponent, rightImageComponent] = this.components

		const imageSize = this.getImageSize(notificationSize)
		const textHeightPaddings = notificationSize.Height / 2 - 6
		const leftPadding = imageSize.Width * 0.2
		const componetsMargin = this.getComponentsMargin(notificationSize)
		const letterWidth = this.getLetterWidth(notificationSize)
		const text = textComponent.text!
		const lowLetters = this.countLowLetters(text)

		const leftImagePosition = notificationSize.Clone()
		leftImagePosition.Width = imageSize.Width
		leftImagePosition.Height = imageSize.Height
		leftImagePosition.x += leftPadding
		leftImagePosition.y += (notificationSize.Height - imageSize.Height) / 2

		const textPosition = notificationSize.Clone()
		textPosition.Width = letterWidth * (text.length - lowLetters)
		textPosition.x = leftImagePosition.x + leftImagePosition.Width + componetsMargin
		textPosition.y += textHeightPaddings

		const rightImagePosition = leftImagePosition.Clone()
		rightImagePosition.x = textPosition.x + textPosition.Width + componetsMargin

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
			this.getFontSize(notificationSize),
			18
		)
	}

	private getImageSize(notificationSize: Rectangle): Rectangle {
		const result = notificationSize.Clone()
		result.Height = (2 / 3) * notificationSize.Height - 4
		result.Width = result.Height
		return result
	}

	private getNotificationSize(position: Rectangle): Rectangle {
		const result = position.Clone()
		result.Width = position.Width + 20
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

	private getComponentsMargin(componentSize: Rectangle): number {
		const baseMargin = this.maxWidth * 0.04
		const scale = componentSize.Width / this.maxWidth
		return baseMargin * scale
	}

	private getLetterWidth(componentSize: Rectangle): number {
		const baseWidth = this.maxWidth * 0.04
		const scale = componentSize.Width / this.maxWidth
		return Math.floor(baseWidth * scale)
	}

	private countLowLetters(text: string) {
		let count = 0
		for (let i = 0; i < text.length; i++) {
			if (text[i] === "l" || text[i] === "i") {
				count++
			}
		}
		return count / 1.5
	}
}
