const SOUNDS = {
  TURN_START: 'https://assets.mixkit.co/active_storage/sfx/2015/2015-preview.mp3',
  GONG: 'https://assets.mixkit.co/active_storage/sfx/2016/2016-preview.mp3',
  DRUM_ROLL: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
  COIN_CLINK: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3',
  SLOT_CLATTER: 'https://assets.mixkit.co/active_storage/sfx/2017/2017-preview.mp3',
  JACKPOT: 'https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3',
  SAD: 'https://assets.mixkit.co/active_storage/sfx/2020/2020-preview.mp3',
  AUCTION_TENSION: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  GAVEL: 'https://assets.mixkit.co/active_storage/sfx/2021/2021-preview.mp3',
};

class SoundManager {
  private audios: Record<string, HTMLAudioElement> = {};
  private volume = 0.2;

  play(key: keyof typeof SOUNDS, loop = false) {
    if (!this.audios[key]) {
      this.audios[key] = new Audio(SOUNDS[key]);
    }
    const audio = this.audios[key];
    audio.loop = loop;
    audio.volume = this.volume;
    audio.currentTime = 0;
    audio.play().catch(e => console.warn('Sound play failed:', e));
  }

  stop(key: keyof typeof SOUNDS) {
    if (this.audios[key]) {
      this.audios[key].pause();
      this.audios[key].currentTime = 0;
    }
  }

  setVolume(v: number) {
    this.volume = v;
    Object.values(this.audios).forEach(a => a.volume = v);
  }
}

export const soundManager = new SoundManager();
