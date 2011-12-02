jQuery(function($) {
	$(document).ajaxError( function(e, xhr, options){
		var errorText = xhr.statusText;
		if (-1 == xhr.responseText.indexOf('<html')) {
			errorText += ': ' + xhr.responseText;
		}
		alert(errorText);
	});


	window.Comment = Backbone.Model.extend({
	});

	window.CommentsList = Backbone.Collection.extend({
		model: Comment,
		url: '/code-comments/comments',
		comparator: function(comment) {
			return comment.get('time');
		}
	});

	window.CommentView = Backbone.View.extend({
		tagName: 'li',
		template:  _.template(CodeComments.templates.comment),
		initialize: function() {
		   this.model.bind('change', this.render, this);
		},
		render: function() {
		   $(this.el).html(this.template(_.extend(this.model.toJSON(), {
				delete_url: CodeComments.delete_url,
				active: this.model.id == CodeComments.active_comment_id,
				can_delete: CodeComments.is_admin,
			})));
		   return this;
		}
	});

	window.TopCommentsView = Backbone.View.extend({
		id: 'top-comments',

		template:  _.template(CodeComments.templates.top_comments_block),
		events: {
			'click button': 'showAddCommentDialog'
		},

		initialize: function() {
			this.textarea = this.$('#comment-text');
			TopComments.bind('add',	  this.addOne, this);
			TopComments.bind('reset', this.addAll, this);
		},

		render: function() {
			$(this.el).html(this.template());
			this.$('button').button();
			TopComments.fetch({data: {path: CodeComments.path, revision: CodeComments.revision, line: 0}});
			return this;
		},

		addOne: function(comment) {
			var view = new CommentView({model: comment});
			this.$("ul.comments").append(view.render().el);
		},
		addAll: function() {
			var view = this;
			TopComments.each(function(comment) {
				view.addOne.call(view, comment);
			});
		},
		showAddCommentDialog: function(e) {
			AddTopCommentDialog.open();
		}

	});

	window.LineCommentsView = Backbone.View.extend({
		id: 'preview',
		initialize: function() {
			LineComments.bind('add',	  this.addOne, this);
			LineComments.bind('reset', this.addAll, this);
			this.viewPerLine = {};
		},
		render: function() {
			LineComments.fetch({data: {path: CodeComments.path, revision: CodeComments.revision, line__gt: 0}});
			//TODO: + links
		},
		addOne: function(comment) {
			var line = comment.get('line');
			if (!this.viewPerLine[line]) {
				this.viewPerLine[line] = new CommentsForALineView();
				$("th#L"+line).parent().after(this.viewPerLine[line].render().el);
			}
			this.viewPerLine[line].addOne(comment);
		},
		addAll: function() {
			var view = this;
			LineComments.each(function(comment) {
				view.addOne.call(view, comment);
			});
		},
	});

	window.CommentsForALineView = Backbone.View.extend({
		tagName: 'tr',
		template: _.template(CodeComments.templates.comments_for_a_line),
		events: {
			'click button': 'showAddCommentDialog'
		},
		render: function() {
			$(this.el).html(this.template());
			this.$('button').button();
			return this;
		},
		addOne: function(comment) {
			var view = new CommentView({model: comment});
			this.line = comment.get('line');
			this.$("ul.comments").append(view.render().el);
		},
		showAddCommentDialog: function() {
			AddLineCommentDialog.open(this.line);
		}
	});

	window.AddCommentDialogView = Backbone.View.extend({
		id: 'add-comment-dialog',
		template:  _.template(CodeComments.templates.add_comment_dialog),
		events: {
			'click .add-comment': 'createComment'
		},
		initialize: function(options) {
			this.$el = $(this.el);
			this.collection = options.collection;
		},
		render: function() {
			this.$el.html(this.template({formatting_help_url: CodeComments.formatting_help_url}))
				.dialog({autoOpen: false, title: 'Add Comment'});
			this.$('.add-comment').button();
			return this;
		},
		open: function(line) {
			this.line = line;
			this.$el.dialog('open');
		},
		close: function() {
			this.$el.dialog('close');
		},
		createComment: function(e) {
			var self = this;
			var text = this.$('textarea').val();
			var line = this.line? this.line : 0;
			if (!text) return;
			var options = {
				success: function() {
					self.$('textarea').val('');
					self.$el.dialog('close');
				}
			}
			this.collection.create({text: text, author: CodeComments.username, path: CodeComments.path, revision: CodeComments.revision, line: line}, options);
		},
	});

	window.TopComments = new CommentsList;
	window.LineComments = new CommentsList;
	window.TopCommentsBlock = new TopCommentsView;
	window.LineCommentsBlock = new LineCommentsView;
	window.AddTopCommentDialog = new AddCommentDialogView({collection: TopComments});
	window.AddLineCommentDialog = new AddCommentDialogView({collection: LineComments});

	$(CodeComments.selectorToInsertBefore).before(TopCommentsBlock.render().el);
	LineCommentsBlock.render();
	AddTopCommentDialog.render();
	AddLineCommentDialog.render();
});