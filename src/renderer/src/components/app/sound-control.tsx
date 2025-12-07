import { useState, useEffect } from 'react'
import useSound from 'use-sound'
import muteIcon from '../../assets/icons/mute.svg'
import unmuteIcon from '../../assets/icons/unmute.svg'
import musicIcon from '../../assets/icons/music.svg'

// import your background music options
import bg_sunset from '../../assets/sounds/sunset-landscape.mp3'
import bg_calm_ocean from '../../assets/sounds/calm-ocean.mp3'
import bg_rainforest from '../../assets/sounds/rainforest.mp3'
import { Button } from '../ui/button'

const SOUND_OPTIONS = [
  { name: 'Sunset Landscape', file: bg_sunset },
  { name: 'Calm Ocean', file: bg_calm_ocean },
  { name: 'Rainforest', file: bg_rainforest }
]

interface SoundControlProps {
  isRunning: boolean
}

export const SoundControl = ({ isRunning }: SoundControlProps) => {
  const [muted, setMuted] = useState(false)
  const [volume, setVolume] = useState<number>(0.25)
  const [selected, setSelected] = useState(SOUND_OPTIONS[0])
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const [play, { stop, sound }] = useSound(selected.file, {
    loop: true,
    volume: muted ? 0 : volume,
    interrupt: false
  })

  // Auto play / stop based on session state
  useEffect(() => {
    if (isRunning) play()
    else stop()
  }, [isRunning, selected])

  // Sync volume dynamically
  useEffect(() => {
    if (sound) {
      sound.volume(muted ? 0 : volume)
    }
  }, [volume, muted, sound])

  // Persist volume & mute
  useEffect(() => {
    const savedVol = localStorage.getItem('sound_volume')
    const savedMute = localStorage.getItem('sound_muted')
    if (savedVol) setVolume(parseFloat(savedVol))
    if (savedMute) setMuted(savedMute === 'true')
  }, [])

  useEffect(() => {
    localStorage.setItem('sound_volume', volume.toString())
    localStorage.setItem('sound_muted', String(muted))
  }, [volume, muted])

  const toggleMute = () => {
    if (muted) {
      setVolume(0.25) //default
    }
    setMuted((m) => !m)
  }

  const handleSelectSound = (soundName: string) => {
    const newSound = SOUND_OPTIONS.find((s) => s.name === soundName)!
    stop()
    setSelected(newSound)
    setDropdownOpen(false)
  }

  return (
    <>
      {/* MUTE BUTTON */}
      <Button onClick={toggleMute} className="vol-btn pixel-btn" data-running={isRunning}>
        {!muted ? <img src={unmuteIcon} width={18} /> : <img src={muteIcon} width={18} />}
      </Button>

      <div className="sound-menu" data-running={isRunning}>
        <div className="sound-menu-dd">
          {/* MUSIC DROPDOWN BUTTON */}
          <Button
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="music-btn pixel-btn"
            data-running={isRunning}
          >
            <img src={musicIcon} width={18} />
          </Button>

          {/* Dropdown */}
          {dropdownOpen && (
            <div className="music-dropdown">
              {SOUND_OPTIONS.map((opt) => (
                <Button
                  key={opt.name}
                  onClick={() => handleSelectSound(opt.name)}
                  className={`music-option ${opt.name === selected.name ? 'active' : ''}`}
                >
                  {opt.name}
                </Button>
              ))}

              <div className="volume-control">
                <label>VOL: {`${Math.floor(volume * 100)}%`}</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={(e) => {
                    if (parseFloat(e.target.value) <= 0) {
                      setMuted(true)
                    } else {
                      setMuted(false)
                    }
                    setVolume(parseFloat(e.target.value))
                  }}
                  className="volume-slider"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
