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
      this.state = U.createState();
    });

    describe("set", function() {
      it("should update the state object", function() {
        this.state.set('state', true);
        expect(this.state.state.state).to.be.true;
      })

      it("should trigger a state:'state' event ", function() {
        var stateSpy = sinon.spy();
        this.state.on('state:state', stateSpy);
        this.state.set('state', true);
        expect(stateSpy).to.have.been.calledWith(true);
      });
    });

    describe("U.watchState", function() {
      it('should call a function when all the required state is set', function() {
        var stateSpy = sinon.spy();
        U.watchState(this.state, ['state1', 'state2'], stateSpy);
        this.state.set('state1', true);
        expect(stateSpy).to.not.have.been.called;
        this.state.set('state2', true);
        expect(stateSpy).to.have.been.called;
      });

      it('should pass optional state to the callback function', function() {
        var stateSpy = sinon.spy();
        U.watchState(this.state, {required: ['state1'], optional: ['state2']}, stateSpy);
        this.state.set('state2', true);
        this.state.set('state1', true);
        expect(stateSpy).to.have.been.calledWith(true, true);
      });

      it('should call the callback when optional state is set', function() {
        var stateSpy = sinon.spy();
        U.watchState(this.state, {required: ['state1'], optional: ['state2']}, stateSpy);
        this.state.set('state1', true);
        expect(stateSpy).to.have.been.calledWith(true);
        stateSpy.reset();
        this.state.set('state2', true);
        expect(stateSpy).to.have.been.calledWith(true, true);
      });
    });
  });


}).call(this);
