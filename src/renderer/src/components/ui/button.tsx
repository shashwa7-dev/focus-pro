import useSound from 'use-sound'
import click_sound from '../../assets/sounds/click.wav'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export function Button({ children, onClick, ...props }: ButtonProps) {
  const [playClick] = useSound(click_sound, { volume: 0.4, interrupt: true })

  return (
    <button
      {...props}
      onClick={(e) => {
        playClick()
        onClick?.(e)
      }}
    >
      {children}
    </button>
  )
}
