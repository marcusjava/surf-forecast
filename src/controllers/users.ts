import { Controller, Post } from '@overnightjs/core';
import { Request, Response } from 'express';
import { User } from '@src/models/user';
import { BaseController } from '@src/controllers';
import { AuthService } from '@src/services/auth';

@Controller('users')
export class UsersController extends BaseController {
  @Post('')
  public async createUser(req: Request, res: Response): Promise<void> {
    try {
      const user = new User(req.body);
      const newUser = await user.save();
      res.status(201).send(newUser);
    } catch (error: any) {
      this.sendCreatedUpdatedErrorResponse(res, error);
    }
  }

  @Post('authenticate')
  public async authenticate(req: Request, res: Response): Promise<Response> {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return this.sendErrorResponse(res, {
        code: 401,
        message: 'User not found',
      });
    }
    if (!(await AuthService.comparePasswords(password, user.password))) {
      return this.sendErrorResponse(res, {
        code: 401,
        message: 'Password does not match',
      });
    }

    //generating token
    const token = AuthService.generateToken(user.toJSON());
    return res.status(200).send({ token });
  }
}
