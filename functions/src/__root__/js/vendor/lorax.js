/* global $ */
/* exports Lorax */
(function () {

  $(document).ready(function () {

    window.Lorax = function (attrs) {
      var self = this
      for (var attr in attrs) {
        self[attr] = attrs[attr]
      }
      this.items = []
      this.$ = $(attrs.selector)
      // this.$addButton = this.$.find('[data-action="add"]')
      // this.$addForm = this.$.find('.item.add')
      // this.$addFormClose = this.$addForm.find('[data-action="close"]')
      this.templates = {}
      this.ingestTemplates = (function () {
        self.$.find('[data-model]').each(function () {
          var $this = $(this)
          var templateHtml = $this.children()[0].outerHTML
          $this.children().first().remove()
          var templateName = $this.data('model')
          self.templates[templateName] = templateHtml
        })
      })()
      this.renderTemplate = function (templateName, data) {
        var render = self.templates[templateName]
        for (var i in data) {
          render = render.replace('[[' + i + ']]', data[i])
        }
        var $this = $(render)
        $this
          .find('[data-state]')
          .not('[data-state="' + data.state + '"]')
          .addClass('hide')
        render = $this[0].outerHTML
        return {
          html: render,
          data: data
        }
      }
      var Row = function (attrs) {
        var row = this
        for (var attr in attrs) {
          row[attr] = attrs[attr]
        }
        this.data = attrs.data
        this.history = []
        var render = self.renderTemplate(attrs.model, this.data)
        this.html = render.html
        if (render.data.state) {
          row.state = render.data.state
        }
        this.$ = $(this.html)
        this.remove = function () { // self descruct
          row.$.remove()
          delete self.data[row.model][row.index]
        }
        this.update = function (data) {
          for (var prop in data) {
            if (typeof prop !== 'undefined') {
              row.data[prop] = data[prop]
              if (prop === 'state') {
                row.updateState(data[prop])
              } else {
                $('.lox').each(function () {
                  var attrs = this.attributes
                  var $this = $(this)
                  for (var i = attrs.length - 1; i >= 0; i--) {
                    var attrName = attrs[i].nodeName
                    var attrValue = attrs[i].value
                    var loxIndexOf = attrName.indexOf('lox') + 4
                    if (loxIndexOf !== -1) {
                      attrValue = row.data[attrValue]
                      if (attrName.substr(loxIndexOf) === 'html') {
                        $this.html(attrValue)
                      } else if (attrName.substr(loxIndexOf) === 'val') {
                        $this.val(attrValue)
                      } else {
                        $this.attr(attrName.substr(loxIndexOf), attrValue)
                      }
                    }
                  }
                })
              }
            }
          }
        }
        this.$
          .find('form')
          .on('submit', function (e) {
            e.preventDefault()
            console.log('submit recieved');
            var invalidField = false
            var $form = $(this)
            $form.find('input').each(function () {
              var $this = $(this)
              if (!$this[0].checkValidity() && !invalidField) {
                invalidField = true
              }
            })
            if (!invalidField) {
              row.updateState('loading')
              if (!row.hasOwnProperty('submitRecieved')) {
                row.submitRecieved = true
                self[$form.data('action')](row, function () {
                  delete row.submitRecieved
                })
              }
            }
          })
        this.$
          .find('[data-action]')
          .on('click', function () {
            var $this = $(this)
            var action = $this.data('action')
            if (action === 'submit') {
              $this.parents('form').submit()
            } else if (action === 'back') {
              var current = row.history.pop()
              var back = row.history.pop()
              row.updateState(back)
            } else if (typeof self[action] === 'function') {
              self[action](row)
            } else if (action) {
              row.updateState(action, function ($toState) {
                var $deleteButton = $toState.find('.button.delete.leftmost')
                $deleteButton
                  .removeAttr('data-action')
                  .addClass('pending')
                row.timeout = window.setTimeout(function () {
                  $deleteButton
                    .attr('data-action', 'delete')
                    .removeClass('pending')
                }, 2000)
              })
            }
          })
        var $insertBefore = attrs.$this.find('[data-insert-before]')
        if ($insertBefore.length) {
          this.$.insertBefore(attrs.insertBefore)
        } else {
          attrs.$this.parent().append(this.$)
        }
        this.updateState = function (toState, callback) {
          toState = toState || 'normal'
          row.history.push(toState)
          window.clearTimeout(row.timeout)
          callback = callback || function () {}
          row.$.find('[data-state]').addClass('hide')
          var $toState = row.$.find('[data-state="' + toState + '"]')
          $toState.removeClass('hide')
          $toState.find('input').eq(0).focus()
          callback($toState)
        }
      }
      this.construct = function () {
        self.$
          .find('[data-model]')
          .each(function () {
            var $this = $(this)
            var model = $(this).data('model')
            for (var i = 0; i <= self.data[model].length - 1; i++) {
              if (!self.data[model][i].obj) {
                self.data[model][i].obj = new Row({
                  index: i,
                  model: model,
                  data: self.data[model][i],
                  '$this': $this
                })
              }
            }
            $this.removeClass('hide')
          })
      }
      // this.addShow = function () {
      //   self.$addForm.removeClass('hide')
      //   self.$addButton.addClass('hide')
      //   self.$addForm.find('input').eq(0).focus()
      // }

      // this.addHide = function () {
      //   self.$addForm.addClass('hide')
      //   self.$addButton.removeClass('hide')
      //   clearAddForm()
      // }

      // this.$addFormClose.on('click', function () {
      //   self.addHide()
      // })

      // this.$addButton.on('click', function () {
      //   self.addShow()
      // })

      // this.$addButton.on('click', function () {
      //   self.addShow()
      // })

      // this.add = function (attrs) {
      //   self.data[attrs.addTo].push(attrs)
      //   self.addHide()
      //   self.construct()
      // }

      // this.$addForm
      //   .on('submit', function (e) {
      //     e.preventDefault()

      //     var data = {
      //       addTo: self.$addForm.data('add-to')
      //     }

      //     var $inputs = self.$addForm.find('input')

      //     $inputs.each(function () {
      //       var $input = $(this)
      //       data[$input.attr('name')] = $input.val()
      //     })
      //     self.add(data)
      //   })

      // this.$addForm
      //   .find('input')
      //   .keypress(function (e) {
      //     if (e.which === 13) {
      //       self.$addForm.submit()
      //       return false
      //     }
      //   })

      // function clearAddForm() {
      //   self.$addForm
      //     .find('input')
      //     .each(function () {
      //       $(this).val('')
      //     })
      // }

      if (this.data) {
        self.construct()
      }
    }
  })
})()
