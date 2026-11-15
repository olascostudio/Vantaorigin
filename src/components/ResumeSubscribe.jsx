// Finishing what somebody started before they had an account.
//
// Pressing Subscribe signed out remembers the creator, then sends them to
// sign up or sign in. Getting back is not one hop: sign up goes to the
// verification screen, and that screen sends them on to the creators hub
// rather than to where they started.
//
// So this does not try to thread a return path through those screens. It
// watches for the moment somebody is signed in with a confirmed address and
// an unfinished intention, finishes it, and takes them to the page they
// pressed it on. That works from whichever screen they happen to land on,
// including one nobody has thought about yet.
//
// It renders nothing. It is mounted once, inside the router.
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../data/AuthContext";
import { forgetIntent, readIntent, subscribeTo } from "../data/subscriptions";

export default function ResumeSubscribe() {
  const { user } = useAuth();
  const navigate = useNavigate();
  // One attempt per intention. Without this, a render while the request is
  // in flight starts a second one.
  //
  // There is deliberately no "is this effect still mounted" flag beside it.
  // There was one, and it meant that when React re-ran this effect because
  // the signed in user's identity changed, the first run's cleanup marked
  // itself dead, and the subscribe that was already in flight completed,
  // cleared the intention, and then skipped taking the person back to the
  // page they started on. They were subscribed and left standing in their
  // hub with nothing to show for it. Navigating is safe from a dead effect;
  // being silent is not.
  const running = useRef(false);

  useEffect(() => {
    if (!user || running.current) return;

    // Still unconfirmed. The intention keeps until they have confirmed,
    // because an address nobody has confirmed is exactly what this flow
    // must not hand to a creator.
    //
    // `emailVerified`, a boolean, is what the API sends to the browser;
    // `emailVerifiedAt`, the timestamp, exists only on the server. This
    // read the timestamp, which is never there, so the resume never fired
    // and somebody who signed up to subscribe landed in their hub with
    // nothing subscribed and no sign anything had gone wrong.
    if (!user.emailVerified) return;

    const username = readIntent();
    if (!username) return;

    running.current = true;

    subscribeTo(username)
      .then((answer) => {
        forgetIntent();
        navigate(`/creator/${username}`, {
          replace: true,
          state: { subscribed: answer?.creatorName || username },
        });
      })
      .catch(() => {
        // Forgotten either way. A failed attempt that stays remembered
        // would retry on every page they open for the rest of the session,
        // and the button on the page is a better place to try again.
        forgetIntent();
        running.current = false;
      });
  }, [user, navigate]);

  return null;
}
