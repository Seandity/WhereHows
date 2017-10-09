import { test } from 'qunit';
import moduleForAcceptance from 'wherehows-web/tests/helpers/module-for-acceptance';
import { loginContainer, authenticationUrl, invalidCredentials } from 'wherehows-web/tests/helpers/login/constants';

moduleForAcceptance('Acceptance | login', {
  beforeEach() {
    visit(authenticationUrl);
  }
});

test('visiting /login', function(assert) {
  andThen(function() {
    assert.equal(currentURL(), authenticationUrl, `the current url is ${authenticationUrl}`);
  });
});

test('should render login form', function(assert) {
  assert.expect(4);

  andThen(() => {
    assert.equal(find(loginContainer).length, 1, 'should have a login form container');
    assert.equal(find('input[type=text]', loginContainer).length, 1, 'should have a username text input field');
    assert.equal(find('input[type=password]', loginContainer).length, 1, 'should have a password text input field');
    assert.equal(find('button[type=submit]', loginContainer).length, 1, 'should have a submit button');
  });
});

test('should display error message with empty credentials', async function(assert) {
  assert.expect(2);

  await click('button[type=submit]');

  assert.ok(find('#login-error').text().length, 'error message element is rendered');
  assert.equal(
    find('#login-error')
      .text()
      .trim(),
    invalidCredentials
  );
});
