import logger from '@src/logger';
import { User } from '@src/models/user';
import { AuthService } from '@src/services/auth';

describe('Users functional tests', () => {
  beforeEach(async () => {
    await User.deleteMany();
  });
  describe('when creating a new user', () => {
    it('Should create a new user successfully with encrypted password', async () => {
      const newUser = {
        name: 'Jown Snow',
        email: 'jown@email.com',
        password: '123456',
      };

      const { status, body } = await global.testRequest
        .post('/users')
        .send(newUser);

      expect(status).toBe(201);
      await expect(
        AuthService.comparePasswords(newUser.password, body.password)
      ).resolves.toBeTruthy();
      expect(body).toEqual(
        expect.objectContaining({
          ...newUser,
          ...{ password: expect.any(String) },
        })
      );
    });

    it('Should return a validation error when a field is missing', async () => {
      const newUser = {
        email: 'jown@email.com',
        password: '123456',
      };

      const { status, body } = await global.testRequest
        .post('/users')
        .send(newUser);

      expect(status).toBe(400);
      expect(body).toEqual({
        code: 400,
        error: 'Bad Request',
        message: 'User validation failed: name: Path `name` is required.',
      });
    });

    it('Should return 409 when email already exists', async () => {
      const newUser = {
        name: 'Jown Snow',
        email: 'jown@email.com',
        password: '123456',
      };

      await global.testRequest.post('/users').send(newUser);
      const { status, body } = await global.testRequest
        .post('/users')
        .send(newUser);

      expect(status).toBe(409);
      expect(body).toEqual({
        code: 409,
        error: 'Conflict',
        message:
          'User validation failed: email: already exists in the database.',
      });
    });
  });

  describe('when authenticating a user', () => {
    it('should generate token for a valid user', async () => {
      const user = {
        name: 'Jown Snow',
        email: 'jown@email.com',
        password: '123456',
      };

      await new User(user).save();

      const { body } = await global.testRequest
        .post('/users/authenticate')
        .send({ email: user.email, password: user.password });

      expect(body).toEqual(
        expect.objectContaining({ token: expect.any(String) })
      );
    });
    it('Should return UNAUTHORIZED if the user with the given email is not found', async () => {
      const response = await global.testRequest
        .post('/users/authenticate')
        .send({ email: 'some-email@mail.com', password: '1234' });

      expect(response.status).toBe(401);
    });
    it('Should return ANAUTHORIZED if the user is found but the password does not match', async () => {
      const newUser = {
        name: 'John Doe',
        email: 'john@mail.com',
        password: '1234',
      };
      await new User(newUser).save();
      const response = await global.testRequest
        .post('/users/authenticate')
        .send({ email: newUser.email, password: 'different password' });

      expect(response.status).toBe(401);
    });
  });

  describe('When getting profile information', () => {
    it(`Should return the token's owner profile information`, async () => {
      const newUser = {
        name: 'John Doe',
        email: 'john@mail.com',
        password: '1234',
      };
      const user = await new User(newUser).save();
      const token = AuthService.generateToken(user.toJSON());
      const { body, status } = await global.testRequest
        .get('/users/me')
        .set({ 'x-access-token': token });

      expect(status).toBe(200);
      expect(body).toMatchObject(JSON.parse(JSON.stringify({ user })));
    });

    it(`Should return Not Found, when the user is not found`, async () => {
      //create a new user but don't save it
      const token = AuthService.generateToken({ id: 'fake-user-id' });
      const { body, status } = await global.testRequest
        .get('/users/me')
        .set({ 'x-access-token': token });

      expect(status).toBe(404);
      expect(body.message).toBe('User not found!');
    });
  });
});
