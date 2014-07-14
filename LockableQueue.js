var _ = require('underscore');

module.exports = LockableQueue;

function LockableQueue(items)
{
    var items = items || [];
    items = _.uniq(items);
    this.items = _.map(items, function(item) {
        return {
            value: item,
            locked: false
        };
    });
}

LockableQueue.prototype.add = function(item) {
    var itemAlreadyAdded = false;
    this.items.forEach(function(i) {
        if(i.value === item) {
            itemAlreadyAdded = true;
        }
    });
    
    if(itemAlreadyAdded) {
        return false;
    }
    
    this.items.push({
        value: item,
        locked: false
    });
    
    return true;
};

LockableQueue.prototype.lockNext = function() {
    var foundItem = false;
    var itemValue;
    this.items.forEach(function(it) {
        if(!foundItem && !it.locked) {
            it.locked = true;
            foundItem = true;
            itemValue = it.value;
        }
    });
    
    if(foundItem) {
        return itemValue;
    }
    throw new Error('No items to lock');
};

LockableQueue.prototype.remove = function(item) {
    this.items.forEach(_.bind(function(it, i) {
        if(it.value == item) {
            this.items.splice(i, 1);
            
            return true;
        }
    }, this));
    
    return false;
}