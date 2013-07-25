(function () {
  describe("U.deepClone", function() {
    it('should clone all parts of an object', function() {
      var testObj = {
        'key1': 1, 
        'key2': [1, 2, 4, 5], 
        'key3': {'key4': 1, 'key5': 2 }
      }
      var cloneObj = U.deepClone(testObj);
      testObj.key1 = 2;
      testObj.key2 = [1, 2];
      testObj.key3.key5 = 5;
      expect(cloneObj).to.have.property('key1')
        .that.equals(1);
      expect(cloneObj).to.have.property('key2')
        .that.deep.equals([1, 2, 4, 5]);
      expect(cloneObj).to.have.property('key3')
        .that.deep.equals({key4: 1, key5: 2});
    });
  });
  describe("U.State", function() {
    beforeEach(function() {
      this.state = _.extend({}, U.State);
      this.state.setInitialState({});
    });

    describe("setState", function() {
      it("should update the state object", function() {
        this.state.setState('state', true);
        expect(this.state._state.state).to.be.true;
      })

      it("should trigger a state:'state' event ", function() {
        var stateSpy = sinon.spy();
        this.state.on('state:state', stateSpy);
        this.state.setState('state', true);
        expect(stateSpy).to.have.been.calledWith(true);
      });
    });

    describe("unsetState", function() {
      it('should set state object property to null', function () {
        this.state.setState('state', true);
        this.state.unsetState('state');
        expect(this.state._state.state).to.be.null;
      });

      it('should trigger an unset:"state" event', function () {
        var stateSpy = sinon.spy();
        this.state.on('unset:state', stateSpy);
        this.state.setState('state', true);
        this.state.unsetState('state');
        expect(stateSpy).to.have.been.called;
      });

      it('should not trigger an event if state isnt set', function() {
        var stateSpy = sinon.spy();
        this.state.on('unset:state', stateSpy);
        this.state.unsetState('state');
        expect(stateSpy).to.not.have.been.called;
      });
    });

    describe("whenState", function() {
      it('should call a function when all the required state is set', function() {
        var stateSpy = sinon.spy();
        this.state.whenState(['state1', 'state2'], stateSpy);
        this.state.setState('state1', true);
        expect(stateSpy).to.not.have.been.called;
        this.state.setState('state2', true);
        expect(stateSpy).to.have.been.called;
      });
    });
  });


}).call(this);
