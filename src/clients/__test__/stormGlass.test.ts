import { StormGlass } from '@src/clients/stormGlass';
import stormGlass3HourFixture from '@test/fixtures/stormglass_weather_3_hours.json';
import stormGlass3HourNormalized from '@test/fixtures/stormglass_normalized_response_3_hours.json';
import * as HTTPUtils from '@src/util/request';

jest.mock('@src/util/request');

describe('StromGlass client', () => {
  /**
   * Used for static method's mocks
   */
  const MockedRequestClass = HTTPUtils.Request as jest.Mocked<
    typeof HTTPUtils.Request
  >;

  const mockedRequest =
    new HTTPUtils.Request() as jest.Mocked<HTTPUtils.Request>;

  it('should return normalized forecast from StormGlass API', async () => {
    const lat = -33.792726;
    const lng = 151.289824;

    mockedRequest.get.mockResolvedValue({
      data: stormGlass3HourFixture,
    } as HTTPUtils.Response);

    const stormGlass = new StormGlass(mockedRequest);
    const response = await stormGlass.fetchPoints(lat, lng);

    expect(response).toEqual(stormGlass3HourNormalized);
  });
  it('should exclude incomplete data points', async () => {
    const lat = -33.792726;
    const lng = 151.289824;
    const incompleteResponse = {
      hours: [
        {
          windDirection: {
            noaa: 300,
          },
          time: '2020-04-26T00:00:00+00:00',
        },
      ],
    };
    mockedRequest.get.mockResolvedValue({
      data: incompleteResponse,
    } as HTTPUtils.Response);

    const stormGlass = new StormGlass(mockedRequest);
    const response = await stormGlass.fetchPoints(lat, lng);

    expect(response).toEqual([]);
  });

  it('should get a generic error from StormGlass service when the request fail before reaching the service', async () => {
    const lat = -33.792726;
    const lng = 151.289824;

    mockedRequest.get.mockRejectedValue({ message: 'Network Error' });

    const stormGlass = new StormGlass(mockedRequest);

    await expect(stormGlass.fetchPoints(lat, lng)).rejects.toThrow(
      'Unexpected error when trying to communicate to StormGlass: Network Error'
    );
  });

  it('should get an StormGlassResponseError when the StormGlass service responds with error', async () => {
    const lat = -33.792726;
    const lng = 151.289824;

    mockedRequest.get.mockRejectedValue({
      response: {
        status: 429,
        data: { errors: ['Rate Limit reached'] },
      },
    });

    /**
     * Mock static function return
     */
    MockedRequestClass.isRequestError.mockReturnValue(true);

    const stormGlass = new StormGlass(mockedRequest);

    await expect(stormGlass.fetchPoints(lat, lng)).rejects.toThrow(
      'Unexpected error returned by the StormGlass service: Error: {"errors":["Rate Limit reached"]} Code: 429'
    );
  });
});
