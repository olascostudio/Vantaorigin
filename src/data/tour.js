// The guided walk around the hub, and what it remembers.
//
// Each step names a control by the data-tour attribute put on the control
// itself, rather than by a CSS selector built out of its classes. A class
// list is a styling decision and changes whenever the styling does; an
// attribute that exists only to be pointed at does not, and a step whose
// target has gone is then a missing attribute somebody can grep for rather
// than a silently broken tour.
//
// path is where the control lives. The tour navigates there itself when the
// next step is on another page, which is what makes it a tour of the product
// rather than of one screen.

export const TOUR_SEEN = "vantaorigin.tour.seen";

export const seenTour = () => {
  try {
    return window.localStorage.getItem(TOUR_SEEN) === "yes";
  } catch {
    return false;
  }
};

export const rememberTourSeen = () => {
  try {
    window.localStorage.setItem(TOUR_SEEN, "yes");
  } catch {
    // Then it offers itself again next visit. A second mechanism for
    // remembering a dismissed tour is not worth the weight.
  }
};

export const forgetTourSeen = () => {
  try {
    window.localStorage.removeItem(TOUR_SEEN);
  } catch {
    // Nothing to undo.
  }
};

// Ordered as somebody would actually meet them: what your page is, how
// people find it, what you put on it, then who followed you, then the
// account itself. Each blurb says what the control is for, in one sentence,
// because the point of the walk is to stop somebody wondering.
export const STEPS = [
  {
    target: "hub-view-page",
    path: "/creators-hub",
    name: "View your page",
    blurb:
      "Opens your public page, the one visitors see at the link you share. The hub you are in now is the private side of it.",
  },
  {
    target: "hub-share",
    path: "/creators-hub",
    name: "Share",
    blurb: "Copies your page link to paste anywhere. This is the link people follow you from.",
  },
  {
    target: "hub-edit",
    path: "/creators-hub",
    name: "Edit",
    blurb: "Your name and the line about you underneath it, which is the first thing anybody reads.",
  },
  {
    target: "hub-add-category",
    path: "/creators-hub",
    name: "Add Category",
    blurb:
      "Groups your characters, so a visitor can tell one project from another. A character does not need one to exist.",
  },
  {
    target: "hub-subscribers",
    path: "/creators-hub",
    name: "Subscribers",
    blurb: "Everyone who followed you. Let us go and look.",
  },
  {
    // Not the "Write to your subscribers" heading, which lives in the
    // Editor tab: that tab is marked Soon and is not the one this page
    // opens on, so the tour waited six seconds for a control that is never
    // on screen and then skipped the step. These figures always are.
    target: "subscribers-figures",
    path: "/creators-hub/subscribers",
    // Not "Subscribers": that is the step before, which is the button that
    // brings you here, and two steps running under one name reads as the
    // tour having stalled.
    name: "Your subscribers",
    blurb:
      "How many people followed you, how many this week, and how many left. They gave you an address so you could write to them about your work.",
  },
  {
    target: "settings-tabs",
    path: "/settings",
    name: "Settings",
    blurb:
      "Your details, your password, and how your page is embedded elsewhere. Everything about the account rather than the work.",
  },
];

// Where to begin. The walk starts on the page somebody is already looking
// at, when there is a step for it, so that the first thing it points at is
// in front of them rather than a navigation away.
export const firstStepOn = (pathname) => {
  const here = STEPS.findIndex((step) => step.path === pathname);
  return here === -1 ? 0 : here;
};
