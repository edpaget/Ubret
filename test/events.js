(function() {
  describe("U.EventEmitter", function() {
    beforeEach(function() {
      this.eventEmitter = _.extend({}, U.EventEmitter);
    });
    it("should exist", function() {
      expect(this.eventEmitter).to.be.ok;
    });

    it("off() - should remove all event listeners", function() {
      this.eventEmitter.on("event!", function() { return 10;});
      expect(this.eventEmitter._listeners).to.be.ok;
      this.eventEmitter.off();
      expect(this.eventEmitter._listeners).to.be.null;
    });

    it("off(event) - should remove all listeners for event", function() {
      this.eventEmitter.on("event!", function() { return 10;});
      this.eventEmitter.on("event2!", function () { return 10;});
      this.eventEmitter.off("event2!");
      console.log(this.eventEmitter);
      expect(this.eventEmitter._listeners['event2!']).to.be.null;
    });

    it("on/trigger, - register an event listener and to respond to a trigger", function() {
      this.eventEmitter.on("event!", function() { expect(true).to.be.true; });
      expect(this.eventEmitter._listeners).to.be.an('Object');
      this.eventEmitter.trigger('event!')
    });
  });

  describe("U.listenTo", function() {
    it("it should create a listener on the object", function() {
      this.eventEmitter = _.extend({}, U.EventEmitter);
      U.listenTo(this.eventEmitter, 'event!', function() {expect(true).to.be.true;});
    });
  });

  describe("U.stopListening", function() {
    it("it should remove listeners from the object", function() {
      this.eventEmitter = _.extend({}, U.EventEmitter);
      U.listenTo(this.eventEmitter, 'event!', function() {return 10;});
      U.stopListening(this.eventEmitter, 'event!');
      expect(this.eventEmitter._listeners['event!']).to.be.null;
    });
  });


}).call(this);
