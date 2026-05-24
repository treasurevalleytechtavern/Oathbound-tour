prepareBackgroundVideo();
prepareNavigation();
prepareTourThemeCopy();
prepareMyspaceTourWall();

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
  if (document.documentElement.dataset.tourTheme !== "myspace" || document.body.dataset.page !== "upcoming") {
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
    showsHeading.textContent = "Latest Bulletins";
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
        <a href="#myspace-bulletins">Blogs</a>
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
      <a href="#myspace-bulletins">Browse</a>
      <a href="https://oathboundband.com">Search</a>
      <a href="https://oathboundband.com/socials">Invite</a>
      <a href="https://www.youtube.com/@Oathbound-Band">Film</a>
      <a href="https://oathboundband.com/contact">Mail</a>
      <a href="#myspace-bulletins">Blog</a>
      <a href="https://oathboundband.com/music">Music</a>
      <a href="#myspace-bulletins">Shows</a>
      <a href="#myspace-friend-space">Friends</a>
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
      <p>myspace.com/oathboundtour</p>
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

    <section id="myspace-friend-space" class="myspace-box myspace-friends-box" aria-labelledby="myspace-friends-title">
      <h2 id="myspace-friends-title">Oathbound's Friend Space</h2>
      <p class="myspace-friends-note">Oathbound has <strong>8</strong> band friends.</p>
      <div id="tour-friends-list" class="tour-friends-list" aria-label="Top 8 Tour Friends"></div>
    </section>
  `;

  const content = document.createElement("div");
  content.className = "myspace-main-column";
  showsShell.id = "myspace-bulletins";

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
  blogTitle.innerHTML = `
    <p>Latest Blog Entry</p>
    <h2>MYSPACE TOUR: pick your city, grab tickets, see you in the pit.</h2>
  `;

  main.prepend(topbar);
  layout.append(sidebar, content);
  content.append(intro, player, blogTitle, showsShell);
  main.append(layout);
  prepareMyspaceAudioPlayer(player);
}

function prepareMyspaceAudioPlayer(player) {
  const audio = player.querySelector(".myspace-audio");
  const toggle = player.querySelector(".myspace-play-toggle");
  const progress = player.querySelector(".myspace-progress");
  const time = player.querySelector(".myspace-time");

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
  });

  audio.addEventListener("loadedmetadata", updateTime);
  audio.addEventListener("timeupdate", updateTime);
  audio.addEventListener("play", () => setPlayingState(true));
  audio.addEventListener("pause", () => setPlayingState(false));
  audio.addEventListener("ended", () => {
    setPlayingState(false);
    updateTime();
  });

  updateTime();
}
