/*
  Firefox Send reported usage to Mozilla's Amplitude instance. That service
  is gone and a self-hosted instance has nobody to report to, so these are
  no-ops that keep the call sites unchanged.
*/

export default function initialize() {}

function noop() {}

export {
  noop as cancelledUpload,
  noop as stoppedUpload,
  noop as completedUpload,
  noop as deletedUpload,
  noop as stoppedDownload,
  noop as completedDownload,
  noop as submittedSignup,
  noop as canceledSignup,
  noop as loggedOut
};
