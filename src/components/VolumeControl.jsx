import { useState } from "react";

export function VolumeControl({ phaserRef }) {
    const [volume, setVolume] = useState(1);

    const handleVolumeChange = (e) => {
        const newVolume = parseFloat(e.target.value);
        setVolume(newVolume);

        const game = phaserRef.current?.game;
        if (game) {
            game.sound.volume = newVolume;
        }
    };

    return (
        <div className="volume-control">
            <label>
                Volume: {Math.round(volume * 100)}%
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={volume}
                    onChange={handleVolumeChange}
                    style={{
                        transform: "rotate(-90deg)",
                        transformOrigin: "center",
                        width: "10rem",
                        height: "0.5rem",
                        marginLeft: "1rem",
                        marginTop: "1rem",
                    }}
                />
            </label>
        </div>
    );
}

