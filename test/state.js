(function () {
  describe("U.StateMachine", function() {
    beforeEach(function() {
      this.fsm = _.extend({}, U.StateMachine);
      this.addSubtractSpy = sinon.spy();
      this.unsetAddSpy = sinon.spy();
      this.fsm.initStateMachine({
        'add subtract' : this.addSubtractSpy,
        'unset:add' : this.unsetAddSpy
      });
    });

    it('should fire callback when setState is called', function() {
      this.fsm.setState('add');
      expect(this.addSubtractSpy).to.not.have.been.called;
      this.fsm.setState('subtract');
      expect(this.addSubtractSpy).to.have.been.called;
    });

    it('should call unset callbacks when unsetState is called', function() {
      this.fsm._stateMachine = ['add', 'subtract'];
      this.fsm.unsetState('add');
      expect(this.unsetAddSpy).to.have.been.called;
    });
  });
}).call(this);
