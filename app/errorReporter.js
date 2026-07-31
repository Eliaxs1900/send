/*
  Stands in for the Sentry client the hosted service used. Errors go to the
  console instead of an external service; the shape is kept so callers don't
  need to care.
*/
export default {
  captureException(err) {

    console.error(err);
  },
  withScope(fn) {
    fn({ setExtra() {}, setTag() {} });
  }
};
