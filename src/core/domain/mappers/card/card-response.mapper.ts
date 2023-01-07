import { Mapper } from '../../../base/mapper';
import { PersonEntity } from '../../entities/person.entity';
import { PersonResponseDto } from '../../../../shared/dtos/person/person-response.dto';
import { CardResponse } from '../../../../shared/dtos/card/card-response';
import { CardEntity } from '../../entities/card.entity';

export class CardResponseMapper
  implements Mapper<CardResponse, CardEntity>
{
  public mapFrom(response: CardResponse): CardEntity {
    const card = new CardEntity();

    return card;
  }

  public mapTo(card: CardEntity): CardResponse {

    const response = new CardResponse();
    
    const [month, day, year] = card?.expirationDate.split('/');

    const date = new Date(+year, +month - 1, +day);
    const noSpaceCardNumber = card.cardNumber.replace(/\s/g, "");
     response.cardNumber = +noSpaceCardNumber
     response.securityCode = card.securityCode
     response.expirationDate = date


    return response;
  }
}