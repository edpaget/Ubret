(function() {
  describe("Ubret.Data", function() {
    beforeEach(function() {
      this.test = _.extend({}, Ubret.Events)
    });

    it('should exist', function() {
      expect(this.test).to.be.ok;
    });
  });
}).call(this);