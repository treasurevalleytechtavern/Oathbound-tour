prepareBackgroundVideo();
prepareNavigation();

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
