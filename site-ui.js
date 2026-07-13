(window.oathboundTourCampaignReady || Promise.resolve()).finally(() => {
  prepareBackgroundVideo();
  prepareNavigation();
  prepareTourThemeCopy();
  prepareMyspaceTourWall();
});

function prepareBackgroundVideo() {
  const video = document.querySelector(".background-video");

  if (!video) {
    return;
  }

  video.muted = true;
  video.defaultMuted = true;
  video.volume = 0;
  video.setAttribute("muted", "");
  video.setAttribute("playsinline", "");

  const playAttempt = video.play();
  if (playAttempt && typeof playAttempt.catch === "function") {
    playAttempt.catch(() => {
      video.setAttribute("data-waiting-for-autoplay", "true");
    });
  }
}

function prepareNavigation() {
  const pageMode = document.body.dataset.page || "";
  document.querySelector(`[data-nav="${pageMode}"]`)?.setAttribute("aria-current", "page");
}

function prepareTourThemeCopy() {
  if (document.body.dataset.page !== "upcoming") {
    return;
  }

  const campaign = window.oathboundActiveTourCampaign;
  if (campaign) {
    return;
  }

  if (document.documentElement.dataset.tourTheme !== "myspace") {
    return;
  }

  const eyebrow = document.querySelector(".eyebrow");
  const title = document.querySelector("#page-title");
  const copy = document.querySelector("#page-copy");
  const showsHeading = document.querySelector("#shows-heading");

  if (eyebrow) {
    eyebrow.textContent = "Myspace Tour 2026";
  }

  if (title) {
    title.innerHTML = "Myspace Tour<span>Pretty Suspect x Oathbound</span>";
  }

  if (copy) {
    copy.textContent = "Pick your city, grab your tickets, and we'll see you in the pit.";
  }

  if (showsHeading) {
    showsHeading.textContent = "Upcoming Shows";
  }
}

function prepareMyspaceTourWall() {
  if (document.documentElement.dataset.tourTheme !== "myspace" || document.body.dataset.page !== "upcoming") {
    return;
  }

  const main = document.querySelector(".site-main");
  const intro = document.querySelector(".intro");
  const showsShell = document.querySelector(".shows-shell");
  const siteHeader = document.querySelector(".site-header");

  if (!main || !intro || !showsShell || document.querySelector(".myspace-topbar")) {
    return;
  }

  createMyspaceEmojiRain();
  siteHeader?.setAttribute("aria-hidden", "true");

  const topbar = document.createElement("header");
  topbar.className = "myspace-topbar";
  topbar.innerHTML = `
    <div class="myspace-topbar__upper">
      <a class="myspace-topbar__brand" href="/">myspace.com<span class="sr-only"> - </span><span>a place for friends</span></a>
      <nav class="myspace-mini-tabs" aria-label="Myspace profile areas">
        <a href="/" aria-current="page">MySpace</a>
        <a href="https://oathboundband.com/about">People</a>
        <a href="https://oathboundband.com">Web</a>
        <a href="https://oathboundband.com/music">Music</a>
        <a href="https://www.youtube.com/@Oathbound-Band">Music Videos</a>
        <a href="#myspace-latest-blog">Blogs</a>
      </nav>
      <form class="myspace-search" action="/" role="search">
        <label class="sr-only" for="myspace-search-input">Search</label>
        <input id="myspace-search-input" type="search" name="q" value="">
        <button type="submit">Search</button>
      </form>
      <p class="myspace-google">powered by <strong>Google</strong></p>
      <p class="myspace-help-links"><a href="https://oathboundband.com">Help</a> | <a href="https://oathboundband.com">SignUp</a></p>
    </div>
    <nav class="myspace-tabs" aria-label="Myspace-inspired navigation">
      <a href="https://oathboundband.com">Home</a>
      <a href="#myspace-upcoming-shows">Browse</a>
      <a href="https://oathboundband.com">Search</a>
      <a href="https://oathboundband.com/socials">Invite</a>
      <a href="https://www.youtube.com/@Oathbound-Band">Film</a>
      <a href="https://oathboundband.com/contact">Mail</a>
      <a href="#myspace-latest-blog">Blog</a>
      <a href="https://oathboundband.com/music">Music</a>
      <a href="#myspace-upcoming-shows">Shows</a>
      <a href="#myspace-friend-space">Friends</a>
      <a href="/street-team/">Street Team</a>
      <a href="/past-shows/">Past Shows</a>
    </nav>
  `;

  const layout = document.createElement("div");
  layout.className = "myspace-profile-layout";

  const sidebar = document.createElement("aside");
  sidebar.className = "myspace-sidebar";
  sidebar.innerHTML = `
    <section class="myspace-box myspace-profile-card" aria-labelledby="myspace-profile-name">
      <h2 id="myspace-profile-name">Oathbound</h2>
      <img class="myspace-profile-photo" src="assets/oathbound-profile-dsc03045-web.jpg" alt="Oathbound band photo">
      <p class="myspace-profile-meta"><strong>Location:</strong> Seattle, WA</p>
      <p class="myspace-profile-meta"><strong>Genre:</strong> Progressive Metalcore</p>
      <p class="myspace-profile-meta"><strong>Mood:</strong> feral</p>
      <p class="myspace-profile-meta"><strong>Listening to:</strong> the room right before the first breakdown</p>
    </section>

    <section class="myspace-box myspace-contact-box" aria-labelledby="myspace-contact-title">
      <h2 id="myspace-contact-title">Contacting Oathbound</h2>
      <div class="myspace-contact-grid">
        <a href="https://oathboundband.com/socials">Add to Friends</a>
        <a href="https://oathboundband.com/contact">Send Message</a>
        <a href="https://oathboundband.com/music">Add to Favorites</a>
        <span class="myspace-contact-decorative" aria-disabled="true">Forward to Friend</span>
        <a href="https://oathboundband.com/socials">Instant Message</a>
        <span class="myspace-contact-decorative" aria-disabled="true">Block User</span>
      </div>
    </section>

    <section class="myspace-box myspace-url-box" aria-labelledby="myspace-url-title">
      <h2 id="myspace-url-title">Myspace URL</h2>
      <p>tour.oathboundband.com</p>
    </section>

    <section class="myspace-box myspace-details-box" aria-labelledby="myspace-details-title">
      <h2 id="myspace-details-title">Band Details</h2>
      <dl>
        <div><dt>Members</dt><dd>Oathbound</dd></div>
        <div><dt>Genre</dt><dd>Progressive Metalcore</dd></div>
        <div><dt>Sounds Like</dt><dd>Melodic metalcore crashing into heavy breakdowns, huge choruses, glitchy atmosphere, and "scream this in your car at 1 AM" energy.</dd></div>
        <div><dt>Influences</dt><dd>We Came as Romans, The Devil Wears Prada, I Prevail, warped-tour-era post-hardcore, modern progressive metalcore, Myspace scene nostalgia, and pit-ready emotional damage.</dd></div>
        <div><dt>Label</dt><dd>Eclipse Records</dd></div>
        <div><dt>Status</dt><dd>On the Myspace Tour</dd></div>
      </dl>
    </section>

  `;

  const content = document.createElement("div");
  content.className = "myspace-main-column";
  showsShell.id = "myspace-upcoming-shows";
  showsShell.classList.add("myspace-upcoming-shows");

  const player = document.createElement("section");
  player.className = "myspace-player myspace-box";
  player.setAttribute("aria-labelledby", "myspace-player-title");
  player.innerHTML = `
    <h2 id="myspace-player-title">Oathbound Music</h2>
    <div class="myspace-player-screen">
      <span>Now Playing:</span>
      <strong>Set Adrift</strong>
    </div>
    <audio class="myspace-audio" preload="metadata" src="assets/audio/Oathbound_Set%20Adrift.mp3"></audio>
    <div class="myspace-player-controls">
      <button class="myspace-play-toggle" type="button" aria-label="Play Set Adrift">play</button>
      <div class="myspace-progress-wrap">
        <input class="myspace-progress" type="range" min="0" max="100" value="0" step="0.1" aria-label="Set Adrift playback progress">
        <span class="myspace-time" aria-live="polite">0:00 / 0:00</span>
      </div>
    </div>
    <div class="myspace-stream-links" aria-label="Listen to Colors in Grey">
      <span>Colors in Grey:</span>
      <a class="myspace-listen-link" href="https://open.spotify.com/album/744KAclbtOvPHRawHOy1C9">Spotify</a>
      <a class="myspace-listen-link" href="https://music.apple.com/us/album/colors-in-grey/1842170817">Apple Music</a>
      <a class="myspace-listen-link" href="https://music.youtube.com/playlist?list=OLAK5uy_mX3NtCciEfpWnJQZXiSWDtOgouXR4NCEM">YouTube Music</a>
    </div>
  `;

  const blogTitle = document.createElement("section");
  blogTitle.className = "myspace-blog-title";
  blogTitle.id = "myspace-latest-blog";
  blogTitle.innerHTML = `
    <p>Latest Blog Entry</p>
    <h2>MYSPACE TOUR: pick your city, grab tickets, see you in the pit.</h2>
  `;

  const friendSpace = document.createElement("section");
  friendSpace.id = "myspace-friend-space";
  friendSpace.className = "myspace-box myspace-friends-box";
  friendSpace.setAttribute("aria-labelledby", "myspace-friends-title");
  friendSpace.innerHTML = `
    <div class="myspace-module-heading">
      <h2 id="myspace-friends-title">Oathbound's Friend Space</h2>
      <p>Oathbound has <strong>4,376</strong> friends.</p>
    </div>
    <div id="tour-friends-list" class="tour-friends-list" aria-label="Top 8 Tour Friends"></div>
  `;

  const comments = document.createElement("section");
  comments.id = "myspace-friends-comments";
  comments.className = "myspace-box myspace-comments-box";
  comments.setAttribute("aria-labelledby", "myspace-comments-title");
  comments.innerHTML = `
    <div class="myspace-module-heading">
      <h2 id="myspace-comments-title">Oathbound's Friends Comments</h2>
      <a href="#myspace-friends-comments">View All Comments</a>
    </div>
    <div class="friends-comments">
      <article class="comment-card">
        <div class="comment-avatar">
          <img src="assets/top8-pretty-suspect.webp" alt="">
          <strong>Pretty Suspect</strong>
        </div>
        <div class="comment-body">
          <p class="comment-time">May 24, 2026 8:42 PM</p>
          <p>tour flyer looks cursed in the best way. everybody stretch your necks now.</p>
        </div>
      </article>
      <article class="comment-card">
        <div class="comment-avatar">
          <span>CC</span>
          <strong>The Campbell Club</strong>
        </div>
        <div class="comment-body">
          <p class="comment-time">May 25, 2026 10:05 AM</p>
          <p>all ages show confirmed. loud guitars loading. bring earplugs and friends.</p>
        </div>
      </article>
      <article class="comment-card">
        <div class="comment-avatar">
          <img src="assets/top8-cosmic-waste.webp" alt="">
          <strong>Cosmic Waste</strong>
        </div>
        <div class="comment-body">
          <p class="comment-time">May 26, 2026 1:11 AM</p>
          <p>albany lineup is stacked. somebody pack extra cables and questionable van snacks.</p>
        </div>
      </article>
      <article class="comment-card">
        <div class="comment-avatar">
          <img src="assets/top8-hide-heaven.webp" alt="">
          <strong>Hide Heaven</strong>
        </div>
        <div class="comment-body">
          <p class="comment-time">May 27, 2026 9:34 AM</p>
          <p>oregon is not ready for this much eyeliner-coded breakdown energy.</p>
        </div>
      </article>
      <article class="comment-card">
        <div class="comment-avatar">
          <span>SK</span>
          <strong>scene_kid_208</strong>
        </div>
        <div class="comment-body">
          <p class="comment-time">May 29, 2026 11:52 AM</p>
          <p>added you after hearing set adrift. please play it on tour or i will be devastated lol.</p>
        </div>
      </article>
      <article class="comment-card">
        <div class="comment-avatar">
          <img src="assets/top8-foghorn.webp" alt="">
          <strong>Foghorn</strong>
        </div>
        <div class="comment-body">
          <p class="comment-time">May 30, 2026 7:08 PM</p>
          <p>portland finale looking dangerous. somebody tell dante's the internet is leaking into the venue.</p>
        </div>
      </article>
    </div>
  `;

  main.prepend(topbar);
  layout.append(sidebar, content);
  content.append(intro, player, blogTitle, showsShell, friendSpace, comments);
  main.append(layout);
  topbar.querySelector(".myspace-search")?.addEventListener("submit", () => {
    window.oathboundAnalytics?.trackEvent("myspace_search_submit", {
      search_term_entered: Boolean(topbar.querySelector("#myspace-search-input")?.value.trim()),
    });
  });
  prepareMyspaceAudioPlayer(player);
}

function createMyspaceEmojiRain() {
  if (document.querySelector(".myspace-emoji-rain")) {
    return;
  }

  const rain = document.createElement("div");
  rain.className = "myspace-emoji-rain";
  rain.setAttribute("aria-hidden", "true");

  const drops = [
    { x: 4, delay: -1, duration: 15, size: 1.9, drift: -18 },
    { x: 10, delay: -9, duration: 19, size: 1.2, drift: 24 },
    { x: 17, delay: -4, duration: 17, size: 1.55, drift: -30 },
    { x: 25, delay: -13, duration: 22, size: 2.05, drift: 16 },
    { x: 33, delay: -7, duration: 18, size: 1.35, drift: 34 },
    { x: 42, delay: -16, duration: 24, size: 1.8, drift: -22 },
    { x: 50, delay: -3, duration: 16, size: 1.15, drift: 28 },
    { x: 58, delay: -11, duration: 20, size: 2.15, drift: -36 },
    { x: 66, delay: -6, duration: 18, size: 1.4, drift: 20 },
    { x: 73, delay: -15, duration: 23, size: 1.75, drift: -26 },
    { x: 82, delay: -8, duration: 19, size: 1.25, drift: 32 },
    { x: 91, delay: -18, duration: 25, size: 2, drift: -20 },
    { x: 97, delay: -5, duration: 17, size: 1.45, drift: 18 },
  ];

  drops.forEach((drop) => {
    const emoji = document.createElement("span");
    emoji.textContent = "\u{1F918}";
    emoji.style.setProperty("--emoji-x", `${drop.x}vw`);
    emoji.style.setProperty("--emoji-delay", `${drop.delay}s`);
    emoji.style.setProperty("--emoji-duration", `${drop.duration}s`);
    emoji.style.setProperty("--emoji-size", `${drop.size}rem`);
    emoji.style.setProperty("--emoji-drift", `${drop.drift}px`);
    rain.appendChild(emoji);
  });

  document.body.prepend(rain);
}

function prepareMyspaceAudioPlayer(player) {
  const audio = player.querySelector(".myspace-audio");
  const toggle = player.querySelector(".myspace-play-toggle");
  const progress = player.querySelector(".myspace-progress");
  const time = player.querySelector(".myspace-time");
  const progressMilestones = new Set();

  if (!audio || !toggle || !progress || !time) {
    return;
  }

  const formatTime = (seconds) => {
    if (!Number.isFinite(seconds) || seconds < 0) {
      return "0:00";
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60).toString().padStart(2, "0");
    return `${minutes}:${remainingSeconds}`;
  };

  const updateTime = () => {
    const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
    const currentTime = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
    progress.value = duration ? String((currentTime / duration) * 100) : "0";
    time.textContent = `${formatTime(currentTime)} / ${formatTime(duration)}`;
  };

  const setPlayingState = (isPlaying) => {
    toggle.textContent = isPlaying ? "pause" : "play";
    toggle.setAttribute("aria-label", `${isPlaying ? "Pause" : "Play"} Set Adrift`);
  };

  toggle.addEventListener("click", () => {
    if (audio.paused) {
      audio.play().catch(() => {
        setPlayingState(false);
      });
      return;
    }

    audio.pause();
  });

  progress.addEventListener("input", () => {
    const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
    if (!duration) {
      return;
    }

    audio.currentTime = (Number(progress.value) / 100) * duration;
    updateTime();
    window.oathboundAnalytics?.trackMyspaceAudio("seek", {
      audio_percent: Math.round(Number(progress.value)),
    });
  });

  audio.addEventListener("loadedmetadata", updateTime);
  audio.addEventListener("timeupdate", () => {
    updateTime();
    const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
    const percent = duration ? Math.floor((audio.currentTime / duration) * 100) : 0;

    [25, 50, 75].forEach((milestone) => {
      if (percent >= milestone && !progressMilestones.has(milestone)) {
        progressMilestones.add(milestone);
        window.oathboundAnalytics?.trackMyspaceAudio("progress", {
          audio_percent: milestone,
        });
      }
    });
  });
  audio.addEventListener("play", () => {
    setPlayingState(true);
    window.oathboundAnalytics?.trackMyspaceAudio("play");
  });
  audio.addEventListener("pause", () => {
    setPlayingState(false);
    if (!audio.ended) {
      window.oathboundAnalytics?.trackMyspaceAudio("pause", {
        audio_seconds: Math.round(audio.currentTime),
      });
    }
  });
  audio.addEventListener("ended", () => {
    setPlayingState(false);
    updateTime();
    window.oathboundAnalytics?.trackMyspaceAudio("complete");
  });

  updateTime();
}
