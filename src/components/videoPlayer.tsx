import React, { useRef, useEffect, useState } from 'react';
import Hls from 'hls.js';

interface AdData {
  src: string;
  duration: number;
  skippableAfter: number;
  timestamp: number; // Time in seconds when the ad should play
}

const VideoPlayer: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isAdPlaying, setIsAdPlaying] = useState(false);
  const [adTimeLeft, setAdTimeLeft] = useState<number | null>(null);
  const [showSkipButton, setShowSkipButton] = useState(false);
  const [currentAdIndex, setCurrentAdIndex] = useState<number | null>(null);
  const [mainVideoStarted, setMainVideoStarted] = useState(false);
  const [lastVideoTime, setLastVideoTime] = useState(0);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(true);

  const ads: AdData[] = [
    {
      src: 'http://content.jwplatform.com/manifests/vM7nH0Kl.m3u8',
      duration: 30,
      skippableAfter: 5,
      timestamp: 5, // Play this ad at 10 seconds
    },
    {
      src: 'http://content.jwplatform.com/manifests/vM7nH0Kl.m3u8',
      duration: 15,
      skippableAfter: 5,
      timestamp: 60, // Play this ad at 30 seconds
    },
  ];

  const mainVideoData = {
    src: 'http://qthttp.apple.com.edgesuite.net/1010qwoeiuryfg/sl.m3u8', // Replace with your `.m3u8` URL
    subtitles: '/subs.vtt'
  };

  useEffect(() => {
    let adTimer: NodeJS.Timeout;

    if (isAdPlaying && adTimeLeft !== null) {
      adTimer = setInterval(() => {
        setAdTimeLeft((prevTime) => {
          if (prevTime !== null) {
            const updatedTime = prevTime - 1;
            if (updatedTime <= 0) {
              endAd();
              return null;
            }
            if (updatedTime <= ads[currentAdIndex!].duration - ads[currentAdIndex!].skippableAfter) {
              setShowSkipButton(true);
            }
            return updatedTime;
          }
          return null;
        });
      }, 1000);
    }

    return () => clearInterval(adTimer);
  }, [isAdPlaying, adTimeLeft, currentAdIndex]);

  useEffect(() => {
    if (videoRef.current && !isAdPlaying) {
      const videoElement = videoRef.current;

      // If the browser supports HLS natively
      if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
        videoElement.src = mainVideoData.src;
      } else if (Hls.isSupported()) {
        // Use Hls.js to load the HLS stream
        const hls = new Hls();
        hls.loadSource(mainVideoData.src);
        hls.attachMedia(videoElement);

        hls.on(Hls.Events.ERROR, (event, data) => {
          console.error('HLS error:', data);
        });
      }
    }
  }, [isAdPlaying]);

  const playAd = (adIndex: number) => {
    if (videoRef.current) {
      const videoElement = videoRef.current;
      setLastVideoTime(videoElement.currentTime + 1); // Save the current time of the main video
      setIsAdPlaying(true);
      setAdTimeLeft(ads[adIndex].duration);
      setShowSkipButton(false);
      setCurrentAdIndex(adIndex);

      // If the browser supports HLS natively
      if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
        videoElement.src = ads[adIndex].src;
      } else if (Hls.isSupported()) {
        // Use Hls.js to load the HLS stream
        const hls = new Hls();
        hls.loadSource(ads[adIndex].src);
        hls.attachMedia(videoElement);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
  
          videoElement.play();
        });
        hls.on(Hls.Events.ERROR, (event, data) => {
          console.error('HLS error:', data);
        });
      }
    }
  };

  const endAd = () => {
    setIsAdPlaying(false);
    setAdTimeLeft(null);
    setShowSkipButton(false);

    // Resume the main video from the last position
    if (videoRef.current) {
      const videoElement = videoRef.current;

      // If the browser supports HLS natively
      if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
        videoElement.src = mainVideoData.src;
        videoElement.currentTime = lastVideoTime;
        videoElement.play();
      } else if (Hls.isSupported()) {
        // Use Hls.js to load the HLS stream
        const hls = new Hls();
        hls.loadSource(mainVideoData.src);
        hls.attachMedia(videoElement);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          videoElement.currentTime = lastVideoTime; // Resume from the saved position
          videoElement.play();
        });
        hls.on(Hls.Events.ERROR, (event, data) => {
          console.error('HLS error:', data);
        });
      }
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current && !isAdPlaying) {
      const currentTime = Math.floor(videoRef.current.currentTime);

      // Check if an ad should play at the current timestamp
      const adIndex = ads.findIndex((ad) => ad.timestamp === currentTime);
      if (adIndex !== -1) {
        playAd(adIndex);
      }
    }
  };

  const handleVideoPlay = () => {
    if (!mainVideoStarted) {
      setMainVideoStarted(true);
    }
  };
  const toggleSubtitles = () => {
    if (videoRef.current) {
      const tracks = videoRef.current.textTracks;
      for (let i = 0; i < tracks.length; i++) {
        tracks[i].mode = subtitlesEnabled ? 'hidden' : 'showing';
      }
      setSubtitlesEnabled(!subtitlesEnabled);
    }
  };
  return (
    <div style={{ position: 'relative', width: '100%', height: 'auto', margin: 'auto', background: 'black', aspectRatio: "16/9", maxWidth:"700px" }}>
      <video
        ref={videoRef}
        controls
        onPlay={handleVideoPlay}
        onTimeUpdate={handleTimeUpdate}
        style={{ width: '100%', height: '100%' }}
      >
        Your browser does not support the video tag.
        {!isAdPlaying&& <track
          label="English"
          kind="subtitles"
          srcLang="en"
          src={mainVideoData.subtitles} // Subtitles for the main video
          default
        />}
      </video>
      {!isAdPlaying&&<button
        onClick={toggleSubtitles}
        style={{
          position: 'absolute',
          bottom: '37px',
          right: '146px',
          background: 'white',
          padding: '5px 10px',
          border: 'none',
          cursor: 'pointer',
          zIndex: 10,
        }}
      >
        {subtitlesEnabled ? 'CC on' : 'CC off'}
      </button>}
      {isAdPlaying && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0, 0, 0, 0.1)',
            color: 'white',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 10,
          }}
        >
          {/* <p>Ad is playing...</p> */}
          {showSkipButton && (
            <button
              onClick={endAd}
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                background: 'white',
                padding: '5px 10px',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Skip Ad
            </button>
          )}
          {adTimeLeft !== null && (
            <p style={{ position: 'absolute', bottom: '10px', right: '10px' }}>
              Ad: {adTimeLeft} seconds left
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
