import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { AppController } from './app.controller';
import { UserController } from './controlleur/user/user.controller';
import { AuthService } from './services/authentificationService/auth.service';
import { AuthController } from './controlleur/auth/auth.controller';
import { VerifyJwtMiddleware } from './midleWare/jwt-utils';
import { EmailModule } from './email/module/email.module';
import { MailService } from './email/service/MailService';
import { RefreshTokenService } from './services/authentificationService/RefreshTokenService';
import { RolesGuard } from './guards/roles.guard';
import {
  AcceptLanguageResolver,
  HeaderResolver,
  I18nModule,
  QueryResolver,
} from 'nestjs-i18n';
import * as path from 'path';
import { StripeController } from './controlleur/stripe/stripe.controller';
import { StripeService } from './services/stripe/stripe.service';
import { UserService } from './services/user/user.service';
import { PdfService } from './services/pdfservice/pdf.service';

@Module({
  imports: [
    EmailModule,
    I18nModule.forRoot({
      fallbackLanguage: 'fr',
      loaderOptions: {
        path: path.join(__dirname, '/i18n/'),
        watch: true,
      },
      resolvers: [
        { use: QueryResolver, options: ['pma_lang'] },
        AcceptLanguageResolver,
        new HeaderResolver(['x-lang']),
      ],
    }),
  ],
  controllers: [
    AppController,
    UserController,
    AuthController,
    StripeController,
  ],
  providers: [
    UserService,
    AuthService,
    MailService,
    RefreshTokenService,
    RolesGuard,
    StripeService,
    PdfService,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(VerifyJwtMiddleware)
      .exclude(
        { path: 'auth/login', method: RequestMethod.POST },
        { path: 'auth/logout', method: RequestMethod.POST },
        { path: 'auth/refresh-access-token', method: RequestMethod.POST },
        { path: 'user/creatUser', method: RequestMethod.POST },
        { path: 'auth/validMail', method: RequestMethod.GET },
        { path: '/traduction', method: RequestMethod.GET },
        { path: 'auth/forgotPassWord', method: RequestMethod.POST },
      )
      .forRoutes('*');
  }
}
